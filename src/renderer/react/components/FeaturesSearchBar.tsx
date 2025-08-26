import React from 'react';

interface FeaturesSearchBarProps {
  searchTerm: string;
  onSearchChange: (searchTerm: string) => void;
}

const FeaturesSearchBar: React.FC<FeaturesSearchBarProps> = ({ 
  searchTerm, 
  onSearchChange 
}) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  };

  return (
    <div className="search-bar">
      <div className="search-group">
        <label>Search:</label>
        <input 
          type="text" 
          value={searchTerm}
          onChange={handleSearchChange}
          placeholder="Search features..."
        />
      </div>
    </div>
  );
};

export default FeaturesSearchBar;