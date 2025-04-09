import React from 'react';

const SubscriptionSuccess = () => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <h1 className="text-2xl font-bold">Subscription Successful!</h1>
      <p>Thank you for subscribing. Your session ID is: {new URLSearchParams(window.location.search).get('session_id')}</p>
    </div>
  );
};

export default SubscriptionSuccess; 