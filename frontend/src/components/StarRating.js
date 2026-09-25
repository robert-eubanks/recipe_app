import React, { useState } from 'react';
import './StarRating.css';

function StarRating({ rating = 0, onChange, readOnly = false }) {
  const [hover, setHover] = useState(null);
  const active = hover ?? rating;

  return (
    <div className={`star-rating${readOnly ? '' : ' star-rating-interactive'}`}>
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          className={`star ${n <= active ? 'star-filled' : ''}`}
          onClick={!readOnly ? () => onChange(n) : undefined}
          onMouseEnter={!readOnly ? () => setHover(n) : undefined}
          onMouseLeave={!readOnly ? () => setHover(null) : undefined}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export default StarRating;
