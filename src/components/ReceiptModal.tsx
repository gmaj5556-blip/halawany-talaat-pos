'use client';

import { format } from 'date-fns';

interface ReceiptModalProps {
  order: any;
  cashierName: string;
  onClose: () => void;
}

export default function ReceiptModal({ order, cashierName, onClose }: ReceiptModalProps) {
  const shortOrderNumber = parseInt(order.order_number.toString().slice(-4)) || order.order_number;

  const handlePrint = () => {
    const printContent = document.getElementById('receipt-content');
    if (!printContent) return;
    
    const windowPrint = window.open('', '', 'width=350,height=600');
    if (!windowPrint) return;

    windowPrint.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;800;900&display=swap');
            body { font-family: 'Cairo', sans-serif; padding: 20px; font-size: 14px; margin: 0; color: #000; }
            .receipt-header { text-align: center; margin-bottom: 20px; }
            .receipt-logo { font-size: 36px; margin-bottom: 4px; line-height: 1; }
            .receipt-title { font-size: 26px; font-weight: 900; margin: 0; }
            .bold { font-weight: 800; }
            .line { border-bottom: 2px dashed #aaa; margin: 15px 0; }
            .solid-line { border-bottom: 2px solid #000; margin: 15px 0; }
            .flex-between { display: flex; justify-content: space-between; align-items: center; direction: rtl; margin-bottom: 6px; }
            table { width: 100%; border-collapse: collapse; direction: rtl; margin: 10px 0; }
            th { border-bottom: 2px solid #000; padding: 8px 0; text-align: right; font-weight: 900; font-size: 15px; }
            td { padding: 8px 0; border-bottom: 1px dashed #ddd; font-weight: 600; }
            th.left, td.left { text-align: left; }
            .total-row { font-size: 20px; font-weight: 900; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 10px 0; margin: 15px 0; }
            .footer-msg { text-align: center; font-size: 18px; font-weight: 900; margin-top: 25px; border-top: 2px dashed #aaa; padding-top: 20px; }
            .order-number { font-size: 24px; font-weight: 900; background: #f3f4f6; padding: 4px 12px; border-radius: 6px; border: 1px solid #ddd; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    
    windowPrint.document.close();
    windowPrint.focus();
    setTimeout(() => {
      windowPrint.print();
      windowPrint.close();
    }, 250);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: '450px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800 }}>🧾 طباعة الإيصال</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px' }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', background: '#fff', color: '#000', padding: '30px 20px', borderRadius: '12px', marginBottom: '20px', fontFamily: 'Cairo, sans-serif', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} id="receipt-content">
          <div className="receipt-header">
            <img src="/logo.png" style={{ width: '80px', height: '80px', borderRadius: '16px', marginBottom: '10px' }} alt="" />
            <h1 className="receipt-title">حلواني طلعت</h1>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#666' }}>أرقى الحلويات والمخبوزات</div>
          </div>
          
          <div className="flex-between" style={{ marginBottom: '12px' }}>
            <span style={{ fontSize: '18px', fontWeight: 800 }}>رقم الطلب:</span>
            <span className="order-number" dir="ltr">#{shortOrderNumber}</span>
          </div>
          <div className="flex-between">
            <span style={{ fontWeight: 600 }}>التاريخ:</span>
            <span dir="ltr" style={{ fontWeight: 600 }}>{format(new Date(order.created_at), 'dd/MM/yyyy hh:mm a')}</span>
          </div>
          <div className="flex-between">
            <span style={{ fontWeight: 600 }}>الكاشير:</span>
            <span className="bold" style={{ fontSize: '16px' }}>{cashierName}</span>
          </div>
          
          <div className="solid-line"></div>
          
          <table>
            <thead>
              <tr>
                <th>الصنف</th>
                <th>الكمية</th>
                <th className="left">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item: any, i: number) => (
                <tr key={i}>
                  <td style={{ fontSize: '15px' }}>{item.product_name}</td>
                  <td style={{ fontSize: '15px' }}>{item.quantity}</td>
                  <td className="left" dir="ltr" style={{ fontSize: '15px' }}>{item.total_price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div style={{ padding: '10px 0' }}>
            <div className="flex-between" style={{ marginBottom: '8px' }}>
              <span style={{ fontWeight: 600 }}>الإجمالي الفرعي:</span>
              <span dir="ltr" style={{ fontWeight: 800 }}>{order.subtotal.toFixed(2)} ج.م</span>
            </div>
            {order.discount > 0 && (
              <div className="flex-between" style={{ marginBottom: '8px', color: '#ef4444' }}>
                <span style={{ fontWeight: 600 }}>خصم:</span>
                <span dir="ltr" style={{ fontWeight: 800 }}>- {order.discount.toFixed(2)} ج.م</span>
              </div>
            )}
            
            <div className="flex-between total-row">
              <span>الإجمالي النهائي:</span>
              <span dir="ltr">{order.total.toFixed(2)} ج.م</span>
            </div>
          </div>
          
          <div>
            <div className="bold" style={{ marginBottom: '10px', fontSize: '15px' }}>تفاصيل الدفع:</div>
            {order.payments.map((p: any, i: number) => {
              const paymentName = p.method === 'cash' ? 'كاش' : p.method === 'card' ? 'فيزا' : p.method === 'instapay' ? 'إنستاباي' : p.method === 'vodafone' ? 'فودافون كاش' : 'توصيل';
              return (
                <div key={i} className="flex-between" style={{ marginBottom: '6px' }}>
                  <span style={{ fontWeight: 600 }}>{paymentName}</span>
                  <span dir="ltr" style={{ fontWeight: 800 }}>{p.amount.toFixed(2)} ج.م</span>
                </div>
              );
            })}
            {order.change > 0 && (
              <div className="flex-between" style={{ marginTop: '10px', fontSize: '16px', background: '#f3f4f6', padding: '8px', borderRadius: '4px' }}>
                <span className="bold">الباقي للعميل:</span>
                <span dir="ltr" className="bold">{order.change.toFixed(2)} ج.م</span>
              </div>
            )}
          </div>
          
          <div className="footer-msg">
            شكراً لزيارتكم! ✨
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1, padding: '14px' }}>
            تخطي
          </button>
          <button className="btn btn-primary" onClick={handlePrint} style={{ flex: 2, fontSize: '18px', padding: '14px' }}>
            🖨️ طباعة الإيصال
          </button>
        </div>
      </div>
    </div>
  );
}
