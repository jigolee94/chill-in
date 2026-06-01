const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

admin.initializeApp();

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_PUSH_CHUNK_SIZE = 100;

function isExpoPushToken(token) {
  return typeof token === 'string'
    && (token.startsWith('ExpoPushToken[') || token.startsWith('ExponentPushToken['));
}

function compactText(value, fallback) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function sendExpoPushMessages(messages) {
  const results = [];

  for (const messageChunk of chunk(messages, EXPO_PUSH_CHUNK_SIZE)) {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'accept-encoding': 'gzip, deflate',
        'content-type': 'application/json'
      },
      body: JSON.stringify(messageChunk)
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      logger.error('Expo push request failed', { status: response.status, body });
      continue;
    }

    const data = Array.isArray(body.data) ? body.data : [body.data];
    results.push(...data);
  }

  return results;
}

exports.notifyArrivalCreated = onDocumentCreated(
  {
    document: 'arrivals/{arrivalId}',
    region: 'asia-northeast3',
    timeoutSeconds: 60,
    memory: '256MiB'
  },
  async (event) => {
    const arrival = event.data?.data();
    if (!arrival || arrival.status !== 'arrived') return;

    const arrivingUserId = compactText(arrival.userId, '');
    const nickname = compactText(arrival.nickname, '친구');
    const placeName = compactText(arrival.placeName, '칠링 지점');

    if (!arrivingUserId) {
      logger.warn('Arrival push skipped because userId is missing', { arrivalId: event.params.arrivalId });
      return;
    }

    const tokenSnapshot = await admin.firestore().collectionGroup('pushTokens').get();
    const tokenDocs = [];

    tokenSnapshot.forEach((doc) => {
      const tokenData = doc.data();
      if (tokenData.enabled === false) return;
      if (tokenData.userId === arrivingUserId) return;
      if (!isExpoPushToken(tokenData.token)) return;
      tokenDocs.push({ ref: doc.ref, token: tokenData.token, userId: tokenData.userId });
    });

    const uniqueTokenDocs = Array.from(
      new Map(tokenDocs.map((tokenDoc) => [tokenDoc.token, tokenDoc])).values()
    );

    if (uniqueTokenDocs.length === 0) {
      logger.info('No Expo push tokens found for arrival notification', {
        arrivalId: event.params.arrivalId,
        arrivingUserId
      });
      return;
    }

    const messages = uniqueTokenDocs.map(({ token }) => ({
      to: token,
      sound: 'default',
      title: "Chill in' 친구 도착",
      body: `${nickname}님이 ${placeName} 근처에 도착했어요.`,
      channelId: 'arrivals',
      data: {
        type: 'arrival',
        arrivalId: event.params.arrivalId,
        userId: arrivingUserId,
        placeId: arrival.placeId || null,
        placeName
      }
    }));

    const results = await sendExpoPushMessages(messages);
    const disablePromises = [];

    results.forEach((result, index) => {
      if (result?.status !== 'error') return;

      logger.warn('Expo push token failed', {
        error: result.message,
        details: result.details,
        tokenOwnerId: uniqueTokenDocs[index]?.userId
      });

      if (result.details?.error === 'DeviceNotRegistered' && uniqueTokenDocs[index]) {
        disablePromises.push(uniqueTokenDocs[index].ref.set({
          enabled: false,
          disabledReason: 'DeviceNotRegistered',
          disabledAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true }));
      }
    });

    await Promise.all(disablePromises);
    logger.info('Arrival push notification sent', {
      arrivalId: event.params.arrivalId,
      recipientCount: uniqueTokenDocs.length
    });
  }
);
