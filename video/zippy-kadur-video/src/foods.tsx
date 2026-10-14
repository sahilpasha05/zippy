import React from 'react';

const sz = {width: 620, height: 620} as const;
export const Biryani = () => (
  <svg viewBox="0 0 200 200" {...sz}>
    <ellipse cx="100" cy="150" rx="78" ry="14" fill="#00000055" />
    <path d="M25 95 Q100 190 175 95Z" fill="#B23A1E" />
    <ellipse cx="100" cy="95" rx="75" ry="22" fill="#E8A33A" />
    {Array.from({length: 40}).map((_, i) => <ellipse key={i} cx={40 + (i * 37) % 120} cy={82 + (i * 13) % 26} rx="7" ry="2.2" fill={i % 3 ? '#FFD27A' : '#F4B24A'} transform={`rotate(${(i * 47) % 180} ${40 + (i * 37) % 120} ${82 + (i * 13) % 26})`} />)}
    <circle cx="80" cy="82" r="9" fill="#7A2B12" /><circle cx="125" cy="86" r="8" fill="#7A2B12" />
    <circle cx="105" cy="74" r="5" fill="#3E9B3E" />
  </svg>
);
export const Pizza = () => (
  <svg viewBox="0 0 200 200" {...sz}>
    <path d="M100 185 L25 40 Q100 5 175 40Z" fill="#F0B352" stroke="#C97F26" strokeWidth="6" strokeLinejoin="round" />
    <path d="M32 52 Q100 20 168 52" stroke="#D98B2B" strokeWidth="10" fill="none" />
    <path d="M45 60 Q100 35 155 60 L100 160Z" fill="#FFD76A" />
    <circle cx="80" cy="75" r="11" fill="#C8321E" /><circle cx="122" cy="82" r="11" fill="#C8321E" /><circle cx="100" cy="115" r="10" fill="#C8321E" />
    <path d="M100 160 Q96 178 102 195 Q108 178 104 160Z" fill="#FFD76A" />
  </svg>
);
export const Burger = () => (
  <svg viewBox="0 0 200 200" {...sz}>
    <path d="M30 95 Q30 30 100 30 Q170 30 170 95Z" fill="#D98B2B" />
    {[60, 90, 120, 145].map((x, i) => <ellipse key={i} cx={x} cy={55 + (i % 2) * 8} rx="5" ry="2.5" fill="#FFE9B0" />)}
    <path d="M28 100 Q50 88 70 100 T112 100 T172 100 L172 110 L28 110Z" fill="#59B34A" />
    <rect x="26" y="108" width="148" height="12" fill="#FFC72C" />
    <rect x="30" y="118" width="140" height="22" rx="10" fill="#5A2E17" />
    <path d="M30 140 H170 Q170 168 100 168 Q30 168 30 140Z" fill="#D98B2B" />
  </svg>
);
export const Fries = () => (
  <svg viewBox="0 0 200 200" {...sz}>
    {Array.from({length: 14}).map((_, i) => <rect key={i} x={48 + i * 8.5} y={30 + (i % 4) * 9} width="9" height="100" rx="2" fill={i % 2 ? '#FFD23F' : '#F5BE22'} transform={`rotate(${(i - 7) * 3} ${52 + i * 8.5} 140)`} />)}
    <path d="M40 105 H160 L148 185 H52Z" fill="#E1362B" />
    <rect x="70" y="128" width="60" height="26" rx="6" fill="#FFD23F" />
  </svg>
);
export const Fruits = () => (
  <svg viewBox="0 0 200 200" {...sz}>
    <circle cx="70" cy="115" r="42" fill="#E63B3B" /><path d="M70 73 Q75 55 90 52" stroke="#3E7B2B" strokeWidth="6" fill="none" />
    <ellipse cx="120" cy="60" rx="14" ry="9" fill="#4DAE3D" transform="rotate(-30 120 60)" />
    <circle cx="135" cy="125" r="38" fill="#FF9B21" /><circle cx="128" cy="115" r="8" fill="#FFC36A" opacity=".6" />
    <path d="M115 165 Q150 190 185 150 Q170 160 150 150Z" fill="#FFE05A" />
    <path d="M30 170 Q60 140 90 170Z" fill="#3E9B3E" />
  </svg>
);
export const Groceries = () => (
  <svg viewBox="0 0 200 200" {...sz}>
    <path d="M45 70 H155 L148 185 H52Z" fill="#C69A5E" /><path d="M75 70 Q75 35 100 35 Q125 35 125 70" stroke="#8C6A38" strokeWidth="6" fill="none" />
    <rect x="62" y="30" width="28" height="55" rx="6" fill="#4DA3FF" transform="rotate(-10 76 57)" />
    <rect x="95" y="22" width="26" height="60" rx="5" fill="#FF6B6B" transform="rotate(8 108 52)" />
    <ellipse cx="135" cy="62" rx="14" ry="18" fill="#6CCB4E" transform="rotate(20 135 62)" />
    <rect x="62" y="110" width="76" height="40" rx="6" fill="#FFF3D1" /><circle cx="100" cy="130" r="12" fill="#E8A33A" />
  </svg>
);
export const FOODS = [Biryani, Pizza, Burger, Fries, Fruits, Groceries];
