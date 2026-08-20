import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { Gallery, Item as GalleryItem } from 'react-photoswipe-gallery';
import { Button } from 'semantic-ui-react';
import { useToggle } from '../../../lib/hooks';
import isImage from '../../../utils/is-image';

import Item from './Item';

import styles from './Attachments.module.scss';

const INITIALLY_VISIBLE = 4;
const DOCUMENT_PREVIEW_WIDTH = 1120;
const DOCUMENT_PREVIEW_HEIGHT = 820;
const SPREADSHEET_EXTENSIONS = ['xls', 'xlsx'];

const getExtension = (item) => {
  const value = item.name || item.url || '';
  const pathname = value.split(/[?#]/)[0];
  const filename = pathname.split('/').pop() || '';
  const extension = filename.slice((Math.max(0, filename.lastIndexOf('.')) || Infinity) + 1);

  return extension.toLowerCase();
};

const getPreviewType = (item) => {
  const extension = getExtension(item);

  if (extension === 'pdf') {
    return 'pdf';
  }

  if (SPREADSHEET_EXTENSIONS.includes(extension)) {
    return 'spreadsheet';
  }

  if ((item.image && typeof item.image === 'object') || isImage(item.url)) {
    return 'image';
  }

  return null;
};

const getSpreadsheetViewerUrl = (url) =>
  `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;

function GalleryImageWithDimensions({
  item,
  previewType,
  slideData,
  isVisible,
  canEdit,
  handleCoverSelect,
  handleCoverDeselect,
  handleUpdate,
  handleDelete,
}) {
  const [dimensions, setDimensions] = React.useState({ width: null, height: null });

  React.useEffect(() => {
    if (previewType === 'image' && isImage(item.url) && !dimensions.width && !dimensions.height) {
      const img = new window.Image();
      img.src = item.url;
      img.onload = () => {
        setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      };
    }
  }, [item.url, previewType, dimensions.width, dimensions.height]);

  if (isImage(item.url) && (!dimensions.width || !dimensions.height)) {
    return null; // or a loader
  }

  return (
    <GalleryItem
      key={item.id}
      original={item.url}
      caption={item.name}
      width={previewType === 'image' ? dimensions.width : slideData.width}
      height={previewType === 'image' ? dimensions.height : slideData.height}
      content={slideData.content}
    >
      {({ ref, open }) =>
        isVisible ? (
          <Item
            ref={ref}
            name={item.name}
            url={item.url}
            coverUrl={previewType === 'image' ? item.coverUrl : undefined}
            createdAt={item.createdAt}
            isCover={item.isCover}
            isPersisted={item.isPersisted}
            canEdit={canEdit}
            onClick={previewType ? open : undefined}
            onCoverSelect={() => handleCoverSelect(item.id)}
            onCoverDeselect={handleCoverDeselect}
            onUpdate={(data) => handleUpdate(item.id, data)}
            onDelete={() => handleDelete(item.id)}
          />
        ) : (
          <span ref={ref} />
        )
      }
    </GalleryItem>
  );
}

GalleryImageWithDimensions.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    url: PropTypes.string,
    coverUrl: PropTypes.string,
    createdAt: PropTypes.instanceOf(Date),
    isCover: PropTypes.bool.isRequired,
    isPersisted: PropTypes.bool.isRequired,
  }).isRequired,
  previewType: PropTypes.oneOf(['image', 'pdf', 'spreadsheet']),
  slideData: PropTypes.shape({
    width: PropTypes.number,
    height: PropTypes.number,
    content: PropTypes.node,
  }),
  isVisible: PropTypes.bool.isRequired,
  canEdit: PropTypes.bool.isRequired,
  handleCoverSelect: PropTypes.func.isRequired,
  handleCoverDeselect: PropTypes.func.isRequired,
  handleUpdate: PropTypes.func.isRequired,
  handleDelete: PropTypes.func.isRequired,
};

GalleryImageWithDimensions.defaultProps = {
  previewType: null,
  slideData: {},
};

const Attachments = React.memo(
  ({ items, canEdit, onUpdate, onDelete, onCoverUpdate, onGalleryOpen, onGalleryClose }) => {
    const [t] = useTranslation();
    const [isAllVisible, toggleAllVisible] = useToggle();

    const handleCoverSelect = useCallback(
      (id) => {
        onCoverUpdate(id);
      },
      [onCoverUpdate],
    );

    const handleCoverDeselect = useCallback(() => {
      onCoverUpdate(null);
    }, [onCoverUpdate]);

    const handleUpdate = useCallback(
      (id, data) => {
        onUpdate(id, data);
      },
      [onUpdate],
    );

    const handleDelete = useCallback(
      (id) => {
        onDelete(id);
      },
      [onDelete],
    );

    const handleBeforeGalleryOpen = useCallback(
      (gallery) => {
        onGalleryOpen();

        gallery.on('destroy', () => {
          onGalleryClose();
        });
      },
      [onGalleryOpen, onGalleryClose],
    );

    const handleToggleAllVisibleClick = useCallback(() => {
      toggleAllVisible();
    }, [toggleAllVisible]);

    const galleryItemsNode = items.map((item, index) => {
      const previewType = getPreviewType(item);
      let slideData;
      if (previewType === 'image' && item.image && typeof item.image === 'object') {
        slideData = item.image;
      } else if (previewType === 'pdf') {
        slideData = {
          width: DOCUMENT_PREVIEW_WIDTH,
          height: DOCUMENT_PREVIEW_HEIGHT,
          content: (
            <object
              data={item.url}
              type="application/pdf"
              className={classNames(styles.content, styles.contentDocument)}
            >
              <iframe
                src={item.url}
                title={item.name}
                className={classNames(styles.content, styles.contentDocument)}
              />
            </object>
          ),
        };
      } else if (previewType === 'spreadsheet') {
        slideData = {
          width: DOCUMENT_PREVIEW_WIDTH,
          height: DOCUMENT_PREVIEW_HEIGHT,
          content: (
            <iframe
              src={getSpreadsheetViewerUrl(item.url)}
              title={item.name}
              className={classNames(styles.content, styles.contentDocument)}
            />
          ),
        };
      } else {
        slideData = {
          content: (
            <span className={classNames(styles.content, styles.contentError)}>
              {t('common.thereIsNoPreviewAvailableForThisAttachment')}
            </span>
          ),
        };
      }
      const isVisible = isAllVisible || index < INITIALLY_VISIBLE;
      return (
        <GalleryImageWithDimensions
          key={item.id}
          item={item}
          previewType={previewType}
          isVisible={isVisible}
          slideData={slideData}
          canEdit={canEdit}
          handleCoverSelect={handleCoverSelect}
          handleCoverDeselect={handleCoverDeselect}
          handleUpdate={handleUpdate}
          handleDelete={handleDelete}
        />
      );
    });

    return (
      <>
        <Gallery
          withCaption
          withDownloadButton
          options={{
            wheelToZoom: true,
            showHideAnimationType: 'none',
            closeTitle: '',
            zoomTitle: '',
            arrowPrevTitle: '',
            arrowNextTitle: '',
            errorMsg: '',
          }}
          onBeforeOpen={handleBeforeGalleryOpen}
        >
          {galleryItemsNode}
        </Gallery>
        {items.length > INITIALLY_VISIBLE && (
          <Button
            fluid
            content={
              isAllVisible
                ? t('action.showFewerAttachments')
                : t('action.showAllAttachments', {
                    hidden: items.length - INITIALLY_VISIBLE,
                  })
            }
            className={styles.toggleButton}
            onClick={handleToggleAllVisibleClick}
          />
        )}
      </>
    );
  },
);

Attachments.propTypes = {
  items: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  canEdit: PropTypes.bool.isRequired,
  onUpdate: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onCoverUpdate: PropTypes.func.isRequired,
  onGalleryOpen: PropTypes.func.isRequired,
  onGalleryClose: PropTypes.func.isRequired,
};

export default Attachments;
