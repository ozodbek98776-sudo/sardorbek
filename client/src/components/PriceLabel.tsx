import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';

interface PriceLabelProps {
  price: number;
  code: string;
  name: string;
  quantity: number;
  date?: string;
  qrData?: string;
}

const PriceLabel: React.FC<PriceLabelProps> = ({
  price,
  code,
  name,
  quantity,
  date = new Date().toLocaleDateString('uz-UZ'),
  qrData
}) => {
  const formatPrice = (num: number) => {
    return new Intl.NumberFormat('uz-UZ').format(num);
  };

  const qrValue = qrData || `${code}-${name}`;

  return (
    <div 
      className="price-label"
      style={{
        width: '280px',
        padding: '12px 16px',
        backgroundColor: '#ffffff',
        border: '1px solid #000000',
        fontFamily: 'Arial, Helvetica, sans-serif',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {/* Left side - Product info */}
        <div style={{ flex: 1 }}>
          {/* Price */}
          <div 
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#DC2626',
              marginBottom: '4px',
              lineHeight: 1.1
            }}
          >
            {formatPrice(price)} so'm
          </div>
          
          {/* Code */}
          <div 
            style={{
              fontSize: '13px',
              color: '#374151',
              marginBottom: '6px'
            }}
          >
            Kod: {code}
          </div>
          
          {/* Product name */}
          <div 
            style={{
              fontSize: '15px',
              fontWeight: '600',
              color: '#111827',
              marginBottom: '6px',
              textTransform: 'uppercase'
            }}
          >
            {name}
          </div>
          
          {/* Quantity */}
          <div 
            style={{
              fontSize: '12px',
              color: '#6B7280',
              marginBottom: '2px'
            }}
          >
            Miqdor: {quantity.toLocaleString()}
          </div>
          
          {/* Date */}
          <div 
            style={{
              fontSize: '11px',
              color: '#9CA3AF'
            }}
          >
            {date}
          </div>
        </div>
        
        {/* Right side - QR Code */}
        <div 
          style={{
            marginLeft: '12px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <QRCodeCanvas value={qrValue} size={64} level="L" includeMargin={false} />
        </div>
      </div>
    </div>
  );
};

export default PriceLabel;
