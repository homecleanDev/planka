import { call, put, select } from 'redux-saga/effects';

import request from '../request';
import selectors from '../../../selectors';
import actions from '../../../actions';
import api from '../../../api';
import { createLocalId } from '../../../utils/local-id';

export function* createAttachment(cardId, data) {
  const localId = yield call(createLocalId);

  yield put(
    actions.createAttachment({
      cardId,
      id: localId,
      name: data.file ? data.file.name : data.name,
    }),
  );

  let attachment;
  try {
    if (data.file) {
      // Get pre-signed URL for direct upload
      const { item: uploadData } = yield call(request, api.getUploadUrl, cardId, {
        filename: data.file.name,
        contentType: data.file.type,
      });

      // Upload file directly to S3
      const response = yield call(fetch, uploadData.presignedUrl, {
        method: 'PUT',
        body: data.file,
        headers: {
          'Content-Type': data.file.type,
        },
        mode: 'cors',
      });

      if (!response.ok) {
        const errorText = yield response.text();
        throw new Error(`Upload failed with status ${response.status}: ${errorText}`);
      }

      // Create attachment record
      ({ item: attachment } = yield call(request, api.create, cardId, {
        key: uploadData.key,
        dirname: uploadData.dirname,
        filename: uploadData.filename,
        name: data.file.name,
      }, localId));
    } else {
      // Legacy file upload through server
      ({ item: attachment } = yield call(request, api.create, cardId, data, localId));
    }
  } catch (error) {
    console.log('Error creating attachment', {
      error,
    });
    yield put(actions.createAttachment.failure(localId, error));
    return;
  }

  yield put(actions.createAttachment.success(localId, attachment));
}

export function* createAttachmentInCurrentCard(data) {
  const { cardId } = yield select(selectors.selectPath);

  yield call(createAttachment, cardId, data);
}

export function* handleAttachmentCreate(attachment, requestId) {
  const isExists = yield select(selectors.selectIsAttachmentWithIdExists, requestId);

  if (!isExists) {
    yield put(actions.handleAttachmentCreate(attachment));
  }
}

export function* updateAttachment(id, data) {
  yield put(actions.updateAttachment(id, data));

  let attachment;
  try {
    ({ item: attachment } = yield call(request, api.updateAttachment, id, data));
  } catch (error) {
    yield put(actions.updateAttachment.failure(id, error));
    return;
  }

  yield put(actions.updateAttachment.success(attachment));
}

export function* handleAttachmentUpdate(attachment) {
  yield put(actions.handleAttachmentUpdate(attachment));
}

export function* deleteAttachment(id) {
  yield put(actions.deleteAttachment(id));

  let attachment;
  try {
    ({ item: attachment } = yield call(request, api.deleteOne, id));
  } catch (error) {
    yield put(actions.deleteAttachment.failure(id, error));
    return;
  }

  yield put(actions.deleteAttachment.success(attachment));
}

export function* handleAttachmentDelete(attachment) {
  yield put(actions.handleAttachmentDelete(attachment));
}

export default {
  createAttachment,
  createAttachmentInCurrentCard,
  handleAttachmentCreate,
  updateAttachment,
  handleAttachmentUpdate,
  deleteAttachment,
  handleAttachmentDelete,
};
