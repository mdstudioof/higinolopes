import { Order } from "@/types";

export const printTicket = (order: Order) => {
  const printWindow = document.createElement("iframe");
  printWindow.style.position = "absolute";
  printWindow.style.top = "-1000px";
  printWindow.style.left = "-1000px";
  document.body.appendChild(printWindow);

  const doc = printWindow.contentWindow?.document;
  if (!doc) return;

  const itemsHtml = order.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 2px 0;">${item.quantity}x ${item.name}</td>
      <td style="text-align: right; padding: 2px 0;">${(item.price * item.quantity).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })}</td>
    </tr>
  `
    )
    .join("");

  const html = `
    <html>
      <head>
        <style>
          @page {
            margin: 0;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 58mm;
            margin: 0;
            padding: 5mm;
            font-size: 12px;
            line-height: 1.2;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 5px 0; }
          .header { margin-bottom: 10px; }
          .footer { margin-top: 15px; font-size: 10px; }
          table { width: 100%; border-collapse: collapse; }
          .order-number { font-size: 18px; margin: 5px 0; }
        </style>
      </head>
      <body>
        <div class="header text-center">
          <div class="bold" style="font-size: 14px;">PANIFICADORA HIGINO LOPES</div>
          <div>Rua Exemplo, 123 - Centro</div>
          <div>Tel: (11) 9999-9999</div>
        </div>

        <div class="divider"></div>

        <div class="text-center">
          <div class="bold">FICHA DE PEDIDO</div>
          <div class="order-number bold">#${order.number}</div>
        </div>

        <div class="divider"></div>

        <div>
          <span class="bold">Cliente:</span> ${order.customerName}<br>
          <span class="bold">Data:</span> ${new Date(order.createdAt).toLocaleDateString("pt-BR")}<br>
          <span class="bold">Hora:</span> ${new Date(order.createdAt).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
        </div>

        <div class="divider"></div>

        <table>
          <thead>
            <tr>
              <th style="text-align: left;">Item</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="divider"></div>

        <div class="text-right bold" style="font-size: 14px;">
          TOTAL: ${order.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </div>

        <div class="footer text-center">
          Obrigado pela preferência!<br>
          Apresente esta ficha no caixa.
        </div>
        
        <script>
          window.onload = function() {
            window.print();
            setTimeout(() => {
              window.frameElement.remove();
            }, 100);
          };
        </script>
      </body>
    </html>
  `;

  doc.open();
  doc.write(html);
  doc.close();
};
