import React from 'react';

interface YearFilterSelectorProps {
  selectedYears: string[];
  onChange: (years: string[]) => void;
  label?: string;
  showAllYearsOption?: boolean;
}

const YearFilterSelector: React.FC<YearFilterSelectorProps> = ({
  selectedYears,
  onChange,
  label = 'Target Years',
  showAllYearsOption = true
}) => {
  const yearOptions = [
    ...(showAllYearsOption ? [{ value: 'All_Years', label: 'All Years' }] : []),
    { value: 'First_Year', label: '1st Year' },
    { value: 'Second_Year', label: '2nd Year' },
    { value: 'Third_Year', label: '3rd Year' },
    { value: 'Fourth_Year', label: '4th Year' },
    { value: 'Masters', label: 'Masters' }
  ];

  const handleToggle = (yearValue: string) => {
    // If "All_Years" is selected, clear all other selections
    if (yearValue === 'All_Years') {
      if (selectedYears.includes('All_Years')) {
        onChange([]);
      } else {
        onChange(['All_Years']);
      }
      return;
    }

    // If any specific year is selected, remove "All_Years"
    const withoutAllYears = selectedYears.filter(y => y !== 'All_Years');
    
    if (withoutAllYears.includes(yearValue)) {
      // Remove the year
      const newSelection = withoutAllYears.filter(y => y !== yearValue);
      onChange(newSelection.length === 0 && showAllYearsOption ? ['All_Years'] : newSelection);
    } else {
      // Add the year
      onChange([...withoutAllYears, yearValue]);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex flex-wrap gap-2">
        {yearOptions.map((option) => {
          const isSelected = selectedYears.includes(option.value);
          const isAllYears = option.value === 'All_Years';
          
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleToggle(option.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isSelected
                  ? isAllYears
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
              }`}
            >
              {option.label}
              {isSelected && (
                <svg
                  className="inline-block ml-2 w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-gray-500 mt-2">
        {selectedYears.length === 0 || selectedYears.includes('All_Years')
          ? 'Visible to all students'
          : `Visible only to: ${selectedYears
              .map(y => yearOptions.find(o => o.value === y)?.label)
              .join(', ')}`}
      </p>
    </div>
  );
};

export default YearFilterSelector;
