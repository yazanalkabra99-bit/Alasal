import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardDescription, CardValue } from './Card';

describe('Card Components', () => {
  it('renders basic Card component', () => {
    const { container } = render(<Card>Test Content</Card>);
    expect(container.querySelector('.glass')).toBeTruthy();
    expect(container.textContent).toContain('Test Content');
  });

  it('applies hover effect when specified', () => {
    const { container } = render(<Card hover>Hover Card</Card>);
    expect(container.querySelector('.glass-hover')).toBeTruthy();
  });

  it('handles click events', () => {
    let clicked = false;
    const handleClick = () => {
      clicked = true;
    };
    
    const { container } = render(<Card onClick={handleClick}>Clickable Card</Card>);
    const card = container.querySelector('.glass') as HTMLElement;
    card?.click();
    expect(clicked).toBe(true);
  });

  it('renders CardHeader with action', () => {
    const { container } = render(
      <CardHeader action={<button>Action</button>}>
        Header Content
      </CardHeader>
    );
    expect(container.textContent).toContain('Header Content');
    expect(container.querySelector('button')).toBeTruthy();
  });

  it('renders CardTitle correctly', () => {
    const { container } = render(<CardTitle>Test Title</CardTitle>);
    expect(container.textContent).toBe('Test Title');
    expect(container.querySelector('.font-bold')).toBeTruthy();
  });

  it('renders CardDescription correctly', () => {
    const { container } = render(<CardDescription>Description text</CardDescription>);
    expect(container.textContent).toBe('Description text');
    expect(container.querySelector('.text-xs')).toBeTruthy();
  });

  it('renders CardValue correctly', () => {
    const { container } = render(<CardValue>1234</CardValue>);
    expect(container.textContent).toBe('1234');
    expect(container.querySelector('.text-2xl')).toBeTruthy();
  });
});