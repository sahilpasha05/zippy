import React from 'react';
import {Img, staticFile} from 'remotion';
import {BRAND} from './config';

/** Original Zippy logo files from the app, never redrawn or distorted. The assets have white backgrounds. */
export const LogoMark: React.FC<{size?: number; card?: boolean}> = ({size = 420, card = true}) => (
  <div style={card ? {background: '#fff', borderRadius: 48, padding: 30, boxShadow: '0 30px 90px rgba(0,0,0,0.6)'} : {}}>
    <Img src={staticFile('zippy-logo-mark.png')} style={{width: size, height: 'auto', display: 'block'}} />
  </div>
);
export const LogoFull: React.FC<{size?: number}> = ({size = 620}) => <Img src={staticFile('zippy-logo.png')} style={{width: size, height: size, display: 'block'}} />;
export {BRAND};
