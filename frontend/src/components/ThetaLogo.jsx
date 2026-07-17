import React from 'react';

/**
 * Premium Theta Pulse Logo — a geometric Θ (theta) emblem.
 * Renders an inline SVG with gradient fills for a luxury brand feel.
 */
const ThetaLogo = ({ size = 24, className = '', style = {} }) => {
    const id = React.useId(); // unique gradient id per instance
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            style={style}
        >
            <defs>
                <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#059669" />
                    <stop offset="50%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
                <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
                    <stop offset="50%" stopColor="rgba(255,255,255,0)" />
                </linearGradient>
            </defs>
            {/* Rounded square background */}
            <rect x="0" y="0" width="48" height="48" rx="14" fill={`url(#${id}-bg)`} />
            {/* Glossy shine overlay */}
            <rect x="0" y="0" width="48" height="48" rx="14" fill={`url(#${id}-shine)`} />
            {/* Theta symbol Θ — outer ellipse */}
            <ellipse cx="24" cy="24" rx="12" ry="14.5" stroke="white" strokeWidth="2.8" fill="none" />
            {/* Theta symbol Θ — horizontal bar */}
            <line x1="14" y1="24" x2="34" y2="24" stroke="white" strokeWidth="2.8" strokeLinecap="round" />
        </svg>
    );
};

export default ThetaLogo;
