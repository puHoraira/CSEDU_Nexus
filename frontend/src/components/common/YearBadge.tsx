import React from 'react';

interface YearBadgeProps {
  yearLevel: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const YearBadge: React.FC<YearBadgeProps> = ({ yearLevel, size = 'md', showIcon = true }) => {
  const getYearDisplay = (year: string): string => {
    const yearMap: Record<string, string> = {
      'First_Year': '1st Year',
      'Second_Year': '2nd Year',
      'Third_Year': '3rd Year',
      'Fourth_Year': '4th Year',
      'Masters': 'Masters',
      'Graduated': 'Graduated'
    };
    return yearMap[year] || year;
  };

  const getYearColor = (year: string): string => {
    const colorMap: Record<string, string> = {
      'First_Year': 'bg-blue-100 text-blue-800 border-blue-300',
      'Second_Year': 'bg-green-100 text-green-800 border-green-300',
      'Third_Year': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'Fourth_Year': 'bg-orange-100 text-orange-800 border-orange-300',
      'Masters': 'bg-purple-100 text-purple-800 border-purple-300',
      'Graduated': 'bg-gray-100 text-gray-800 border-gray-300'
    };
    return colorMap[year] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getSizeClasses = (): string => {
    const sizeMap: Record<string, string> = {
      'sm': 'text-xs px-2 py-0.5',
      'md': 'text-sm px-3 py-1',
      'lg': 'text-base px-4 py-2'
    };
    return sizeMap[size];
  };

  const getIconSize = (): string => {
    const sizeMap: Record<string, string> = {
      'sm': 'w-3 h-3',
      'md': 'w-4 h-4',
      'lg': 'w-5 h-5'
    };
    return sizeMap[size];
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-full border ${getYearColor(
        yearLevel
      )} ${getSizeClasses()}`}
    >
      {showIcon && (
        <svg
          className={getIconSize()}
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
        </svg>
      )}
      <span>{getYearDisplay(yearLevel)}</span>
    </span>
  );
};

export default YearBadge;
