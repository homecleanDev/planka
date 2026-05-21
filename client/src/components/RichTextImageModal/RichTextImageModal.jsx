import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Form, Input, Loader, Modal } from 'semantic-ui-react';

import { FilePicker } from '../../lib/custom-ui';

const RichTextImageModal = React.memo(({ isOpen, onClose, onInsert, onUpload }) => {
  const [url, setUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const handleClose = useCallback(() => {
    setUrl('');
    setUploadError(null);
    onClose();
  }, [onClose]);

  const handleSubmit = useCallback(() => {
    const cleanUrl = url.trim();
    if (!cleanUrl) {
      return;
    }

    onInsert(cleanUrl);
    setUrl('');
    onClose();
  }, [onClose, onInsert, url]);

  const handleUpload = useCallback(
    async (file) => {
      if (!onUpload) {
        return;
      }

      try {
        setIsUploading(true);
        setUploadError(null);
        const uploadedUrl = await onUpload(file);
        if (uploadedUrl) {
          onInsert(uploadedUrl);
          setUrl('');
          onClose();
        }
      } catch (error) {
        setUploadError(error.message || 'Failed to upload image');
      } finally {
        setIsUploading(false);
      }
    },
    [onClose, onInsert, onUpload],
  );

  return (
    <Modal open={isOpen} size="small" onClose={handleClose}>
      <Modal.Header>Insert Image</Modal.Header>
      <Modal.Content>
        <Form onSubmit={handleSubmit}>
          <Form.Field
            control={Input}
            label="Image URL"
            value={url}
            placeholder="https://example.com/image.png"
            onChange={(_, { value }) => setUrl(value)}
          />
          <Button primary type="submit">
            Submit
          </Button>
          <FilePicker accept="image/*" onSelect={handleUpload}>
            <Button type="button" loading={isUploading} disabled={isUploading}>
              Upload Image
            </Button>
          </FilePicker>
          <Button type="button" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          {isUploading && <Loader active inline size="tiny" />}
          {uploadError && <div>{uploadError}</div>}
        </Form>
      </Modal.Content>
    </Modal>
  );
});

RichTextImageModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onInsert: PropTypes.func.isRequired,
  onUpload: PropTypes.func,
};

RichTextImageModal.defaultProps = {
  onUpload: undefined,
};

export default RichTextImageModal;
