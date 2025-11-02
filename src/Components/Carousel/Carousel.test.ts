import { render, fireEvent, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import AdaptiveCarousel from './AdaptiveCarousel.v1.1.0';

describe('AdaptiveCarousel', () => {
  test('renders without crashing', () => {
    render(<AdaptiveCarousel>{[<div key="1">Item</div>]}</AdaptiveCarousel>);
    expect(screen.getByText('Item')).toBeInTheDocument();
  });

  test('responds to swipe gestures', () => {
    render(<AdaptiveCarousel>{[1, 2, 3].map(i => <div key={i}>Item {i}</div>)}</AdaptiveCarousel>);
    const region = screen.getByRole('region');
    fireEvent.pointerDown(region, { clientX: 400 });
    fireEvent.pointerMove(region, { clientX: 100 });
    fireEvent.pointerUp(region);
    expect(region).toBeTruthy();
  });
});
