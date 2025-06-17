import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders OneSecure heading', () => {
  render(<App />);
  const linkElement = screen.getByText(/OneSecure Domain Security Assessment/i);
  expect(linkElement).toBeInTheDocument();
});
