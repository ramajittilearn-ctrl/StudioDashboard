import QRCode from 'qrcode';
import { fromSatang } from './finance';

/**
 * CRC16 calculation for EMVCo standard (CCITT polynomial 0x1021)
 */
function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    let x = ((crc >> 8) ^ data.charCodeAt(i)) & 0xff;
    x ^= x >> 4;
    crc = ((crc << 8) ^ (x << 12) ^ (x << 5) ^ x) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Format field in TLV (Tag-Length-Value)
 */
function formatTlv(tag: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${tag}${len}${value}`;
}

/**
 * Generate standard EMVCo PromptPay QR string
 * Supports mobile number (08x-xxx-xxxx, 10 digits) or national ID/tax ID (13 digits)
 */
export function generatePromptPayPayload(target: string, amountSatang?: number): string {
  // Strip non-digits
  const cleanTarget = (target || '').replace(/[^0-9]/g, '');
  let formattedTarget = '';
  let subTag = '01'; // 01 for mobile, 02 for tax ID

  if (cleanTarget.length === 10 && cleanTarget.startsWith('0')) {
    // Mobile number: prefix with 0066 and remove leading 0
    formattedTarget = '0066' + cleanTarget.substring(1);
    subTag = '01';
  } else if (cleanTarget.length === 13) {
    formattedTarget = cleanTarget;
    subTag = '02';
  } else {
    // Fallback if formatting doesn't strictly match: assume mobile format
    formattedTarget = cleanTarget.startsWith('0') ? '0066' + cleanTarget.substring(1) : cleanTarget;
  }

  // Tag 29 sub-payload: AID + Target
  const aid = formatTlv('00', 'A000000677010111');
  const targetTlv = formatTlv(subTag, formattedTarget);
  const merchantInfo = aid + targetTlv;

  let payload = '';
  payload += formatTlv('00', '01'); // Version
  payload += formatTlv('01', amountSatang && amountSatang > 0 ? '12' : '11'); // Dynamic (with amount) or Static
  payload += formatTlv('29', merchantInfo);
  payload += formatTlv('53', '764'); // THB
  
  if (amountSatang !== undefined && amountSatang > 0) {
    const amountStr = fromSatang(amountSatang).toFixed(2);
    payload += formatTlv('54', amountStr);
  }
  
  payload += formatTlv('58', 'TH');
  
  // Tag 63: CRC placeholder
  const payloadToCrc = payload + '6304';
  const checksum = crc16(payloadToCrc);
  return payloadToCrc + checksum;
}

/**
 * Generate QR code as SVG string or DataURL for rendering in HTML
 */
export async function generateQrDataUrl(payload: string): Promise<string> {
  try {
    return await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 256,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('Error generating QR data URL:', err);
    return '';
  }
}
