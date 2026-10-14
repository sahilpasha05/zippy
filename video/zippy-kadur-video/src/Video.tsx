import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile} from 'remotion';
import {sceneRange} from './timing';
import {Scene1} from './scenes/Scene1';
import {Scene2} from './scenes/Scene2';
import {Scene3} from './scenes/Scene3';
import {Scene4} from './scenes/Scene4';
import {Scene5} from './scenes/Scene5';
import {Scene6} from './scenes/Scene6';
import {Scene7} from './scenes/Scene7';
import {Scene8} from './scenes/Scene8';
import {Scene9} from './scenes/Scene9';

const SC: [string, React.FC][] = [['s1', Scene1], ['s2', Scene2], ['s3', Scene3], ['s4', Scene4], ['s5', Scene5], ['s6', Scene6], ['s7', Scene7], ['s8', Scene8], ['s9', Scene9]];
export const Video: React.FC = () => (
  <AbsoluteFill style={{background: '#000'}}>
    {SC.map(([id, C]) => <Sequence key={id} {...sceneRange(id)}><C /></Sequence>)}
    <Audio src={staticFile('music.wav')} />
  </AbsoluteFill>
);
