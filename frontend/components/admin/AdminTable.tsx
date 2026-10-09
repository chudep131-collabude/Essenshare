import React from 'react';

export interface Column {
  key: string;
  label: string;
  width?: string;
}

export interface AdminTableProps {
  columns: Column[];
  rows: Record<string, unknown>[];
  renderCell?: (key: string, value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

export default function AdminTable({ columns, rows, renderCell }: AdminTableProps) {
  return (
    <div
      style={{
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--line)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          minWidth: '600px',
        }}
      >
        <thead>
          <tr
            style={{
              background: 'var(--surface-soft)',
            }}
          >
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                style={{
                  width: col.width,
                  padding: 'var(--space-s) var(--space-m)',
                  textAlign: 'left',
                  fontSize: 'var(--step--1)',
                  fontWeight: 600,
                  color: 'var(--ink-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  borderBottom: '1px solid var(--line)',
                  whiteSpace: 'nowrap',
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  padding: 'var(--space-2xl)',
                  textAlign: 'center',
                  color: 'var(--ink-muted)',
                  fontSize: 'var(--step-0)',
                  background: 'var(--surface)',
                }}
              >
                No records found
              </td>
            </tr>
          ) : (
            rows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                style={{
                  background: 'var(--surface)',
                  borderBottom: rowIdx < rows.length - 1 ? '1px solid var(--line)' : 'none',
                  transition: `background var(--dur-fast) var(--ease-out)`,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.background = 'var(--surface-soft)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.background = 'var(--surface)';
                }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: 'var(--space-s) var(--space-m)',
                      fontSize: 'var(--step-0)',
                      color: 'var(--ink)',
                      verticalAlign: 'middle',
                    }}
                  >
                    {renderCell
                      ? renderCell(col.key, row[col.key], row)
                      : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
