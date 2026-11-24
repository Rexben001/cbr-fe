import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NotificationProvider, useNotifications } from './notifications';

function Trigger() {
  const notifications = useNotifications();
  return (
    <>
      <button onClick={() => notifications.success('Saved.', 'save')}>
        Success
      </button>
      <button onClick={() => notifications.error('Failed.', 'fail')}>
        Error
      </button>
    </>
  );
}

describe('notifications', () => {
  it('renders accessible variants and deduplicates repeated actions', () => {
    render(
      <NotificationProvider>
        <Trigger />
      </NotificationProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Success' }));
    fireEvent.click(screen.getByRole('button', { name: 'Success' }));
    expect(screen.getAllByText('Saved.')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Error' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Failed.');
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Dismiss notification' })[0],
    );
    expect(screen.queryByText('Saved.')).not.toBeInTheDocument();
  });
});
