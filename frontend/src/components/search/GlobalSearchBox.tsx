import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Users, Calendar, Briefcase, MessageSquare, Vote, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { globalSearch, type SearchResultItem } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import './GlobalSearchBox.css';

// Extend SearchResultItem to add computed properties
type EnhancedSearchResultItem = SearchResultItem & {
  avatar?: string;
  image?: string;
  metadata?: string;
};

interface GlobalSearchBoxProps {
  placeholder?: string;
  className?: string;
}

export function GlobalSearchBox({ placeholder = 'Search users, events, workshops...', className = '' }: GlobalSearchBoxProps) {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<EnhancedSearchResultItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      if (!token) return;
      
      setIsLoading(true);
      try {
        const data = await globalSearch({ q: query.trim(), limit: 20 });
        const allResults: EnhancedSearchResultItem[] = [
          ...data.users.map(u => ({
            ...u,
            avatar: u.avatarUrl || u.title.charAt(0),
            metadata: u.member ? `${u.member.academicYearLevel} • Batch ${u.member.batch}` : u.roles?.join(', ')
          })),
          ...data.events.map(e => ({
            ...e,
            image: e.imageUrl,
            metadata: `${e.startDate ? new Date(e.startDate).toLocaleDateString() : ''} ${e.location ? `• ${e.location}` : ''}`
          })),
          ...data.workshops.map(w => ({
            ...w,
            image: w.imageUrl,
            metadata: `${w.startDate ? new Date(w.startDate).toLocaleDateString() : ''} ${w.location ? `• ${w.location}` : ''}`
          })),
          ...data.meetings.map(m => ({
            ...m,
            metadata: `${m.startDate ? new Date(m.startDate).toLocaleDateString() : ''} ${m.location ? `• ${m.location}` : ''}`
          })),
          ...data.elections.map(el => ({
            ...el,
            metadata: `${el.status ? el.status : ''} ${el.startDate ? `• ${new Date(el.startDate).toLocaleDateString()}` : ''}`
          }))
        ];
        setResults(allResults);
        setIsOpen(allResults.length > 0);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, token]);

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : results.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < results.length) {
          handleResultClick(results[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleResultClick = (result: SearchResultItem) => {
    const routes: Record<string, string> = {
      user: `/dashboard/user/${result.id}`,
      event: `/dashboard/events/${result.id}`,
      workshop: `/dashboard/workshops/${result.id}`,
      meeting: `/dashboard/meetings/${result.id}`,
      election: `/dashboard/elections/${result.id}`
    };

    const route = routes[result.type];
    if (route) {
      navigate(route);
      setIsOpen(false);
      setQuery('');
      setHighlightedIndex(-1);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const getCategoryIcon = (type: string) => {
    switch (type) {
      case 'user': return <Users size={16} />;
      case 'event': return <Calendar size={16} />;
      case 'workshop': return <Briefcase size={16} />;
      case 'meeting': return <MessageSquare size={16} />;
      case 'election': return <Vote size={16} />;
      default: return <Search size={16} />;
    }
  };

  const getCategoryLabel = (type: string) => {
    switch (type) {
      case 'user': return 'User';
      case 'event': return 'Event';
      case 'workshop': return 'Workshop';
      case 'meeting': return 'Meeting';
      case 'election': return 'Election';
      default: return type;
    }
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.trim()})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) => 
      regex.test(part) ? (
        <mark key={i} className="search-highlight">{part}</mark>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, EnhancedSearchResultItem[]>);

  return (
    <div className={`global-search-box ${className}`}>
      <div className="search-input-wrapper">
        <Search size={15} className="search-icon" />
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck="false"
        />
        {isLoading && (
          <Loader2 size={15} className="search-loading" />
        )}
        {query && !isLoading && (
          <button className="search-clear" onClick={clearSearch} aria-label="Clear search">
            <X size={15} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && results.length > 0 && (
          <motion.div
            ref={dropdownRef}
            className="search-dropdown"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
          >
            {Object.entries(groupedResults).map(([type, items]) => (
              <div key={type} className="search-category">
                <div className="search-category-header">
                  {getCategoryIcon(type)}
                  <span>{getCategoryLabel(type)}s</span>
                  <span className="search-category-count">{items.length}</span>
                </div>
                <div className="search-results-list">
                  {items.map((result, index) => {
                    const globalIndex = results.indexOf(result);
                    return (
                      <button
                        key={result.id}
                        className={`search-result-item ${highlightedIndex === globalIndex ? 'highlighted' : ''}`}
                        onClick={() => handleResultClick(result)}
                        onMouseEnter={() => setHighlightedIndex(globalIndex)}
                      >
                        {result.image && (
                          <img src={result.image} alt="" className="search-result-image" />
                        )}
                        {result.avatar && (
                          <div className="search-result-avatar">
                            {result.avatar.startsWith('http') ? (
                              <img src={result.avatar} alt="" />
                            ) : (
                              <span>{result.avatar}</span>
                            )}
                          </div>
                        )}
                        <div className="search-result-content">
                          <div className="search-result-title">
                            {highlightMatch(result.title, query)}
                          </div>
                          {result.subtitle && (
                            <div className="search-result-subtitle">
                              {highlightMatch(result.subtitle, query)}
                            </div>
                          )}
                          {result.metadata && (
                            <div className="search-result-metadata">
                              {result.metadata}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {isOpen && query.trim().length >= 2 && !isLoading && results.length === 0 && (
        <motion.div
          className="search-dropdown search-no-results"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
        >
          <Search size={32} className="no-results-icon" />
          <p className="no-results-title">No results found</p>
          <p className="no-results-subtitle">Try searching with different keywords</p>
        </motion.div>
      )}
    </div>
  );
}
