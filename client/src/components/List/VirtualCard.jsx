import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import CardContainer from '../../containers/CardContainer';

import styles from './VirtualCard.module.scss';

const VirtualCard = ({ id, index }) => {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
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
    <div ref={cardRef} className={classNames(styles.cardWrapper, !isVisible && styles.hidden)}>
      <CardContainer id={id} index={index} />
    </div>
  );
};

VirtualCard.propTypes = {
  id: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
};

export default VirtualCard;
