import { useState } from 'react'
import { ShoppingCart, Loader2, Save } from 'lucide-react'
import { useInboxOrders } from '../../hooks/useInboxOrders'
import { useDomains } from '../../hooks/useDomains'
import { useClients } from '../../hooks/useClients'
import { orderInboxesBulk } from '../../lib/infrastructure-api'
import Button from '../ui/Button'
import ClientFilter from '../ui/ClientFilter'

const PROVIDERS = ['Mission Inbox', 'InboxKit']
const MIN_QUANTITY = 100

export default function InboxOrders() {
  const { clients } = useClients()
  const { domains } = useDomains()
  const { orders, loading, refetch } = useInboxOrders()

  const [provider, setProvider] = useState('')
  const [quantity, setQuantity] = useState('')
  const [selectedDomain, setSelectedDomain] = useState('')
  const [selectedClient, setSelectedClient] = useState('')
  const [ordering, setOrdering] = useState(false)

  const handleOrder = async () => {
    if (!provider || !quantity || parseInt(quantity) < MIN_QUANTITY) {
      return
    }

    setOrdering(true)
    try {
      await orderInboxesBulk({
        provider,
        quantity: parseInt(quantity),
        domain: selectedDomain || undefined,
        client: selectedClient || undefined,
      })
      await refetch()
      // Reset form
      setProvider('')
      setQuantity('')
      setSelectedDomain('')
      setSelectedClient('')
    } catch (err) {
      console.error('Error placing order:', err)
    } finally {
      setOrdering(false)
    }
  }

  const estimatedCost = quantity ? parseInt(quantity) * 0.5 : 0 // Placeholder pricing

  return (
    <div className="space-y-6">
      {/* Order Form */}
      <div className="bg-rillation-card rounded-xl p-6 border border-rillation-border">
        <h3 className="text-lg font-semibold text-rillation-text mb-4 flex items-center gap-2">
          <ShoppingCart size={20} className="text-rillation-purple" />
          Place Bulk Order
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-rillation-text-muted mb-2">
              Provider *
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full px-4 py-2 bg-rillation-bg border border-rillation-border rounded-lg text-rillation-text focus:outline-none focus:border-rillation-purple"
            >
              <option value="">Select Provider</option>
              {PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-rillation-text-muted mb-2">
              Quantity * (Min: {MIN_QUANTITY})
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min={MIN_QUANTITY}
              placeholder={`${MIN_QUANTITY}+`}
              className="w-full px-4 py-2 bg-rillation-bg border border-rillation-border rounded-lg text-rillation-text focus:outline-none focus:border-rillation-purple"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-rillation-text-muted mb-2">
              Domain (Optional)
            </label>
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="w-full px-4 py-2 bg-rillation-bg border border-rillation-border rounded-lg text-rillation-text focus:outline-none focus:border-rillation-purple"
            >
              <option value="">Select Domain</option>
              {domains.map((domain) => (
                <option key={domain.id} value={domain.domain}>
                  {domain.domain}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-rillation-text-muted mb-2">
              Client (Optional)
            </label>
            <ClientFilter
              clients={clients}
              selectedClient={selectedClient}
              onChange={setSelectedClient}
            />
          </div>
        </div>

        {quantity && parseInt(quantity) >= MIN_QUANTITY && (
          <div className="mt-4 p-4 bg-rillation-bg rounded-lg border border-rillation-border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-rillation-text-muted">Estimated Cost:</span>
              <span className="text-lg font-bold text-rillation-text">
                ${estimatedCost.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        <Button
          variant="primary"
          onClick={handleOrder}
          disabled={ordering || !provider || !quantity || parseInt(quantity) < MIN_QUANTITY}
          className="mt-4 w-full"
        >
          {ordering ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Placing Order...
            </>
          ) : (
            <>
              <Save size={16} />
              Place Order
            </>
          )}
        </Button>
      </div>

      {/* Order History */}
      <div className="bg-rillation-card rounded-xl border border-rillation-border overflow-hidden">
        <div className="p-4 border-b border-rillation-border">
          <h3 className="text-lg font-semibold text-rillation-text">Order History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-rillation-card-hover">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase">
                  Order ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase">
                  Provider
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase">
                  Quantity
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase">
                  Client
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rillation-border/30">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-rillation-purple border-t-transparent rounded-full animate-spin" />
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-rillation-text-muted">
                    No orders found
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-rillation-card-hover transition-colors">
                    <td className="px-4 py-3 text-sm text-rillation-text">
                      {order.order_id || `#${order.id}`}
                    </td>
                    <td className="px-4 py-3 text-sm text-rillation-text-muted">
                      {order.provider}
                    </td>
                    <td className="px-4 py-3 text-sm text-rillation-text-muted">
                      {order.quantity}
                    </td>
                    <td className="px-4 py-3 text-sm text-rillation-text-muted">
                      {order.client || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          order.status === 'completed'
                            ? 'bg-rillation-green/20 text-rillation-green'
                            : order.status === 'processing'
                            ? 'bg-rillation-orange/20 text-rillation-orange'
                            : order.status === 'failed'
                            ? 'bg-rillation-red/20 text-rillation-red'
                            : 'bg-rillation-purple/20 text-rillation-purple'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-rillation-text-muted">
                      {order.created_at
                        ? new Date(order.created_at).toLocaleDateString()
                        : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}















