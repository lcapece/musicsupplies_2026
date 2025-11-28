import React, { useState, useEffect, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  ColumnDef,
  flexRender,
  Row,
} from '@tanstack/react-table';
import { supabase } from '../../lib/supabase';

interface OrderItem {
  price: number;
  quantity: number;
  partnumber: string;
  description: string;
  extended_price: number;
}

interface WebOrder {
  id: number;
  order_number: number;
  account_number: number;
  account_name: string;
  order_items: OrderItem[];
  subtotal: string;
  discount_amount: string;
  status: string;
  promo_code: string | null;
  created_at: string;
  backend_ivd: string | null;
  order_status: string;
}

const WebOrdersTab: React.FC = () => {
  const [orders, setOrders] = useState<WebOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWebOrders();
  }, []);

  const fetchWebOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      // Main query to get web orders with account names and promo codes
      const { data: ordersData, error: ordersError } = await supabase
        .from('web_orders')
        .select(`
          id,
          order_number,
          account_number,
          order_items,
          subtotal,
          discount_amount,
          status,
          created_at,
          accounts_lcmd!inner(acct_name)
        `)
        .order('order_number', { ascending: false })
        .limit(100);

      if (ordersError) {
        throw ordersError;
      }

      // Get promo codes used
      const { data: promoData, error: promoError } = await supabase
        .from('promo_code_usage')
        .select(`
          order_id,
          promo_codes(code)
        `);

      if (promoError) {
        console.warn('Error fetching promo codes:', promoError);
      }

      // Fetch backend invoice_number and status from view (outer-join semantics handled client-side)
      const orderNumbers = ordersData?.map(order => String(order.order_number)) || [];
      const { data: backendData, error: backendError } = await supabase
        .from('v_legacy_order_info')
        .select('invoice_number, status, web_order_number')
        .in('web_order_number', orderNumbers);

      if (backendError) {
        console.warn('Error fetching backend mapping:', backendError);
      }

      const backendLookup = new Map<string, { ivd: string; status: string }>();
      backendData?.forEach((row: any) => {
        const won = String(row.web_order_number);
        if (!backendLookup.has(won)) {
          backendLookup.set(won, { ivd: row.invoice_number, status: row.status });
        }
      });

      // Create promo code lookup
      const promoLookup = new Map();
      promoData?.forEach((item: any) => {
        if (item.promo_codes && typeof item.promo_codes === 'object' && 'code' in item.promo_codes) {
          promoLookup.set(item.order_id, item.promo_codes.code);
        }
      });

      // Process orders data (outer-merge with backend status/invoice)
      const processedOrders: WebOrder[] = ordersData?.map(order => {
        const backend = backendLookup.get(String(order.order_number));
        // Prefer backend status if available; otherwise fall back to original order status
        const finalStatus: string = backend?.status ?? order.status;

        return {
          ...order,
          account_name: (order as any).accounts_lcmd?.acct_name || 'Unknown',
          promo_code: promoLookup.get(order.id) || null,
          backend_ivd: backend?.ivd || null,
          order_status: finalStatus
        };
      }) || [];

      setOrders(processedOrders);
    } catch (err) {
      console.error('Error fetching web orders:', err);
      setError('Failed to load web orders. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo<ColumnDef<WebOrder>[]>(
    () => [
      {
        id: 'expander',
        header: '',
        cell: ({ row }) => (
          <button
            {...{
              onClick: row.getToggleExpandedHandler(),
              style: { cursor: 'pointer' },
            }}
            className="text-blue-600 hover:text-blue-800 font-bold text-lg p-2"
          >
            {row.getIsExpanded() ? '−' : '+'}
          </button>
        ),
        size: 50,
      },
      {
        accessorKey: 'order_number',
        header: 'Web Order Number',
        cell: ({ getValue }) => (
          <span className="font-mono text-sm">{getValue<number>()}</span>
        ),
      },
      {
        accessorKey: 'backend_ivd',
        header: 'Backend',
        cell: ({ getValue }) => {
          const ivd = getValue<string | null>();
          return ivd ? (
            <span className="text-sm font-bold text-red-600">{ivd}</span>
          ) : (
            <span className="text-sm text-gray-400">-</span>
          );
        },
        size: 120,
      },
      {
        accessorKey: 'account_name',
        header: 'Customer Name',
        cell: ({ getValue, row }) => (
          <div className="text-sm">
            <div className="font-medium text-gray-900">{getValue<string>()}</div>
            <div className="text-xs text-gray-500 font-mono">Acct: {row.original.account_number}</div>
          </div>
        ),
        size: 200,
      },
      {
        accessorKey: 'subtotal',
        header: 'Subtotal',
        cell: ({ getValue }) => (
          <span className="font-mono text-sm">
            ${parseFloat(getValue<string>()).toFixed(2)}
          </span>
        ),
      },
      {
        accessorKey: 'promo_code',
        header: 'Promo Code',
        cell: ({ getValue }) => {
          const promoCode = getValue<string | null>();
          return promoCode ? (
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
              {promoCode}
            </span>
          ) : (
            <span className="text-gray-400 text-xs">None</span>
          );
        },
      },
      {
        accessorKey: 'order_status',
        header: 'Status',
        cell: ({ getValue }) => {
          const status = getValue<string>();
          const statusColors: Record<string, string> = {
            'Not Shipped': 'bg-yellow-100 text-yellow-800',
            'Processing': 'bg-blue-100 text-blue-800',
            'Shipped': 'bg-green-100 text-green-800',
            'Canceled': 'bg-red-100 text-red-800',
            'Completed': 'bg-green-100 text-green-800',
            'Pending Confirmation': 'bg-yellow-100 text-yellow-800',
          };
          return (
            <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
              {status}
            </span>
          );
        },
      },
      {
        accessorKey: 'created_at',
        header: 'Order Date',
        cell: ({ getValue }) => (
          <span className="text-sm text-gray-600">
            {new Date(getValue<string>()).toLocaleDateString()}
          </span>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: orders,
    columns,
    getRowCanExpand: () => true,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  const renderExpandedRow = (row: Row<WebOrder>) => {
    const order = row.original;
    const orderItems = order.order_items || [];

    return (
      <tr className="bg-gray-50">
        <td colSpan={columns.length} className="px-6 py-4">
          <div className="bg-white rounded-lg border p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Order Items</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Part Number
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Extended Price
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orderItems.map((item, index) => (
                    <tr key={index} className={item.partnumber.includes('DISCOUNT') ? 'bg-green-50' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-2 text-sm font-mono text-gray-900">
                        {item.partnumber}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {item.description}
                        {item.partnumber.includes('DISCOUNT') && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Discount
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm text-right text-gray-900">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-2 text-sm text-right font-mono text-gray-900">
                        ${item.price.toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-sm text-right font-mono text-gray-900 font-medium">
                        ${item.extended_price.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {order.discount_amount && parseFloat(order.discount_amount) > 0 && (
              <div className="mt-3 text-right">
                <span className="text-sm text-gray-600">
                  Total Discount: 
                  <span className="font-medium text-green-600 ml-1">
                    ${parseFloat(order.discount_amount).toFixed(2)}
                  </span>
                </span>
              </div>
            )}
          </div>
        </td>
      </tr>
    );
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading web orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={fetchWebOrders}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Web Orders Administration</h2>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">
            Showing {orders.length} orders
          </span>
          <button
            onClick={fetchWebOrders}
            className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                  <tr className="hover:bg-gray-50">
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                  {row.getIsExpanded() && renderExpandedRow(row)}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {orders.length === 0 && (
          <div className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Web Orders Found</h3>
            <p className="text-gray-600">
              No web orders are currently available to display.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WebOrdersTab;
