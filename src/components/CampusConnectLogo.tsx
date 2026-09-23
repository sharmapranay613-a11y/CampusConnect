import React from 'react';

interface CampusConnectLogoProps {
  className?: string;
  height?: number | string;
  title?: string;
}

export const CampusConnectLogo: React.FC<CampusConnectLogoProps> = ({
  className = 'w-10 h-10',
  height,
  title = 'CampusConnect',
}) => {
  return (
    <svg
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`aspect-square shrink-0 ${className}`}
      style={height ? { height, width: height } : undefined}
      aria-label={title}
      role="img"
    >
      <defs>
        {/* Royal / Azure Blue Gradient matching the official logo */}
        <linearGradient id="cc-blue-grad" x1="60" y1="50" x2="340" y2="340" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="20%" stopColor="#2563EB" />
          <stop offset="65%" stopColor="#1D4ED8" />
          <stop offset="100%" stopColor="#1E40AF" />
        </linearGradient>

        {/* Deep Midnight Navy Gradient for bottom overlapping fold */}
        <linearGradient id="cc-navy-grad" x1="160" y1="260" x2="350" y2="360" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E3A8A" />
          <stop offset="45%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#080E1E" />
        </linearGradient>
      </defs>

      {/* Main 'C' Shape */}
      <path
        d="M 305 125
           C 285 70, 240 46, 195 46
           C 112 46, 52 112, 52 200
           C 52 288, 112 354, 195 354
           C 245 354, 288 332, 318 296
           C 310 278, 280 268, 248 270
           C 190 274, 142 238, 138 200
           C 134 158, 172 120, 218 120
           C 255 120, 282 136, 298 158
           C 306 150, 312 136, 305 125
           Z"
        fill="url(#cc-blue-grad)"
      />

      {/* Lower Overlapping Midnight Swoosh / Ribbon */}
      <path
        d="M 148 298
           C 185 328, 238 354, 285 342
           C 330 330, 348 295, 335 258
           C 318 285, 276 302, 230 300
           C 192 298, 162 285, 148 298
           Z"
        fill="url(#cc-navy-grad)"
      />

      <path
        d="M 195 354
           C 248 354, 295 330, 325 292
           C 346 265, 348 235, 338 212
           C 325 248, 288 285, 242 292
           C 198 298, 170 326, 195 354
           Z"
        fill="url(#cc-navy-grad)"
      />

      {/* 3D Isometric Mortarboard (Graduation Cap) */}
      {/* 1. Cap Base / Headband Front Faces */}
      <polygon
        points="191,202 235,217 235,248 191,233"
        fill="#0C1D33"
      />
      <polygon
        points="235,217 277,202 277,233 235,248"
        fill="#071220"
      />

      {/* 2. Flat Top Diamond (Rhombus) */}
      <polygon
        points="234,150 310,183 234,217 160,183"
        fill="#0E233F"
      />

      {/* 3. Tassel cord and bell */}
      <path
        d="M 234 182
           Q 282 178, 298 184
           L 305 212"
        stroke="#0E233F"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="305" cy="214" r="3.5" fill="#071220" />
      <path
        d="M 302 215
           C 300 220, 298 230, 303 238
           C 305 241, 309 241, 311 238
           C 316 230, 314 220, 312 215
           Z"
        fill="#0E233F"
      />
    </svg>
  );
};
