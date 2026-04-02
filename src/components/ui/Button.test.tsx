import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Button } from './Button';

describe('Button Component', () => {
  it('renders without crashing', () => {
    const { container } = render(<Button>Test Button</Button>);
    expect(container).toBeTruthy();
  });

  it('renders children correctly', () => {
    const { getByText } = render(<Button>Hello World</Button>);
    expect(getByText('Hello World')).toBeTruthy();
  });

  it('applies disabled state when loading', () => {
    const { container } = render(<Button loading>Processing</Button>);
    const button = container.querySelector('button');
    expect(button?.hasAttribute('disabled')).toBe(true);
  });

  it('handles click events', () => {
    let clicked = false;
    const handleClick = () => {
      clicked = true;
    };
    
    const { container } = render(<Button onClick={handleClick}>Click Me</Button>);
    const button = container.querySelector('button') as HTMLButtonElement;
    button?.click();
    expect(clicked).toBe(true);
  });
});