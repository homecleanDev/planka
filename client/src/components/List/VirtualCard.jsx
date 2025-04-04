import React, { useEffect, useRef, useState, Suspense } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import CardContainer from '../../containers/CardContainer';

import styles from './VirtualCard.module.scss';

// Lazy load the CardContainer component
const LazyCardContainer = React.lazy(() => import('../../containers/CardContainer'));

const VirtualCard = ({ id, index }) => {
  const [shouldLoad, setShouldLoad] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          // Once loaded, we can disconnect the observer
          observer.disconnect();
        }
      },
      {
        root: null,
        rootMargin: '100px',
        threshold: 0,
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, []);

  return (
    <div ref={cardRef} className={styles.cardWrapper}>
      {shouldLoad ? (
        <Suspense fallback={<div className={styles.cardPlaceholder} />}>
          <LazyCardContainer id={id} index={index} />
        </Suspense>
      ) : (
        <div className={styles.cardPlaceholder} />
      )}
    </div>
  );
};

VirtualCard.propTypes = {
  id: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
};

export default VirtualCard;
