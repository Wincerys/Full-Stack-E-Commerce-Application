export default function LoadingSkeleton({ type = 'card', count = 1 }) {
  const CardSkeleton = () => (
    <div className="bg-white rounded-lg shadow p-6 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
      <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
      <div className="h-3 bg-gray-200 rounded w-5/6 mb-4"></div>
      <div className="flex gap-2 mt-4">
        <div className="h-8 bg-gray-200 rounded w-20"></div>
        <div className="h-8 bg-gray-200 rounded w-20"></div>
      </div>
    </div>
  );

  const TableSkeleton = () => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            {[1, 2, 3, 4].map(i => (
              <th key={i} className="p-4">
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...Array(count)].map((_, i) => (
            <tr key={i} className="border-t border-gray-100">
              {[1, 2, 3, 4].map(j => (
                <td key={j} className="p-4">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const StatSkeleton = () => (
    <div className="bg-white rounded-lg shadow p-6 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
      <div className="h-8 bg-gray-200 rounded w-3/4"></div>
    </div>
  );

  if (type === 'table') return <TableSkeleton />;
  if (type === 'stat') return (
    <>
      {[...Array(count)].map((_, i) => (
        <StatSkeleton key={i} />
      ))}
    </>
  );
  
  return (
    <>
      {[...Array(count)].map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </>
  );
}
