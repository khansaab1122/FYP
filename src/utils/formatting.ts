// Utility functions for formatting

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
  }).format(amount);
};

export const formatDate = (date: Date | string): string => {
  return new Date(date).toLocaleDateString('en-PK');
};

export const formatDateTime = (date: Date | string): string => {
  return new Date(date).toLocaleString('en-PK');
};

export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/[^0-9+]/g, '');
  return cleaned.startsWith('+92') ? cleaned : cleaned.replace(/^92/, '+92');
};
