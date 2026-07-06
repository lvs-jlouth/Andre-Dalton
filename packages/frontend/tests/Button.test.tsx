import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '../src/components/ui/Button.js';

describe('Button component', () => {
  it('renders children', () => {
    render(<Button>Send</Button>);
    expect(screen.getByText('Send')).toBeInTheDocument();
  });

  it('renders as a button element', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('applies disabled state', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('calls onClick handler', () => {
    let clicked = false;
    render(<Button onClick={() => { clicked = true; }}>Click</Button>);
    screen.getByRole('button').click();
    expect(clicked).toBe(true);
  });

  it('has minimum height for touch target compliance', () => {
    render(<Button size="md">Touch target</Button>);
    const btn = screen.getByRole('button');
    // min-h-[44px] is applied — check class is present
    expect(btn.className).toContain('min-h');
  });
});
