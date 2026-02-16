import React from 'react';

export const FieldError: React.FC<{ error?: string }> = ({ error }) => {
    if (!error) return null;
    return <p className="text-xs text-red-500 mt-1">{error}</p>;
};
