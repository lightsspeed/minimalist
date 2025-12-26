import { useState, useEffect } from 'react';
import QRCode from 'qrcode';

interface QRCodeData {
  dataUrl: string;
  svgString: string;
}

export function useQRCode(data: string) {
  const [qrCode, setQRCode] = useState<QRCodeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!data) {
      setQRCode(null);
      return;
    }

    const generateQRCode = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Generate PNG data URL
        const dataUrl = await QRCode.toDataURL(data, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        });

        // Generate SVG string
        const svgString = await QRCode.toString(data, {
          type: 'svg',
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        });

        setQRCode({ dataUrl, svgString });
      } catch (err) {
        console.error('Error generating QR code:', err);
        setError(err instanceof Error ? err.message : 'Failed to generate QR code');
      } finally {
        setLoading(false);
      }
    };

    generateQRCode();
  }, [data]);

  const downloadPng = (filename: string = 'qr-code.png') => {
    if (!qrCode?.dataUrl) return;
    
    const link = document.createElement('a');
    link.href = qrCode.dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadSvg = (filename: string = 'qr-code.svg') => {
    if (!qrCode?.svgString) return;
    
    const blob = new Blob([qrCode.svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copySvg = async (): Promise<boolean> => {
    if (!qrCode?.svgString) return false;
    
    try {
      await navigator.clipboard.writeText(qrCode.svgString);
      return true;
    } catch {
      return false;
    }
  };

  return {
    qrCode,
    loading,
    error,
    downloadPng,
    downloadSvg,
    copySvg,
  };
}
