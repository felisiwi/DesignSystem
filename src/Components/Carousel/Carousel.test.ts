import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';

// Mock framer module since it's not available in test environment
vi.mock('framer', () => ({
  addPropertyControls: vi.fn(),
  ControlType: {
    Array: 'Array',
    Number: 'Number',
    Boolean: 'Boolean',
    Enum: 'Enum',
    Color: 'Color',
    ComponentInstance: 'ComponentInstance',
  },
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  useMotionValue: () => ({ get: () => 0, set: vi.fn(), stop: vi.fn() }),
  animate: vi.fn(() => Promise.resolve()),
  PanInfo: {},
}));

// Import the actual monolithic component
import AdaptiveCarousel from './AdaptiveCarousel.1.0.2';

describe('AdaptiveCarousel (Monolithic)', () => {
  test('renders without crashing', () => {
    render(<AdaptiveCarousel>{[<div key="1">Item 1</div>]}</AdaptiveCarousel>);
    expect(screen.getByText('Item 1')).toBeInTheDocument();
  });

  test('renders multiple items', () => {
    render(
      <AdaptiveCarousel>
        {[1, 2, 3].map(i => <div key={i}>Item {i}</div>)}
      </AdaptiveCarousel>
    );
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
  });

  test('has accessible carousel region', () => {
    render(
      <AdaptiveCarousel>
        {[1, 2].map(i => <div key={i}>Item {i}</div>)}
      </AdaptiveCarousel>
    );
    const region = screen.getByRole('region');
    expect(region).toBeInTheDocument();
    expect(region).toHaveAttribute('aria-label');
  });

  test('renders with default props', () => {
    const { container } = render(
      <AdaptiveCarousel>
        <div>Test Content</div>
      </AdaptiveCarousel>
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  test('handles empty children gracefully', () => {
    const { container } = render(<AdaptiveCarousel>{[]}</AdaptiveCarousel>);
    expect(container.textContent).toContain('No content to display');
  });
});
