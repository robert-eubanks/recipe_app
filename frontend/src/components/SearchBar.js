import React, { useState } from 'react';

function SearchBar({ categories, onSearch, onClear, hasActiveSearch }) {
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    onSearch(query, categoryId);
  };

  const handleClear = () => {
    setQuery('');
    setCategoryId('');
    onClear();
  };

  return (
    <div className="search-container">
      <form onSubmit={handleSearch}>
        <input
          type="text"
          className="search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search recipes..."
        />

        <select
          className="search-select"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        <div className="search-buttons">
          <button type="submit" className="btn btn-primary">Search</button>
          {hasActiveSearch && (
            <button type="button" className="btn btn-secondary" onClick={handleClear}>
              Clear
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default SearchBar;
