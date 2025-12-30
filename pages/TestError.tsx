import React from 'react';
import ContentErrorPage from '../components/ContentErrorPage';

/**
 * Test page to preview the ContentErrorPage component
 * Access via: /test-error
 */
const TestError: React.FC = () => {
  return (
    <ContentErrorPage 
      errorMessage="Sorry we're having trouble with your request."
    />
  );
};

export default TestError;
