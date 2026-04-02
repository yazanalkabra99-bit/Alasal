import React from 'react';
import { Navigate } from 'react-router-dom';

// Backward compatible route: /flight-tickets/new
// We now handle creation from the list page via a modal.
export function FlightTicketCreatePage() {
  return <Navigate to="/flight-tickets?new=1" replace />;
}
