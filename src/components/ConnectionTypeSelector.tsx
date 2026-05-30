/**
 * Connection Type Selector
 * 
 * ATTRACTOR: "Relationships have semantics"
 * GROUNDING: The kind of relationship changes how structure should be interpreted
 */

import React from 'react';
import { ConnectionType, CONNECTION_TYPE_LABELS, CONNECTION_TYPE_COLORS } from '../types/canvas';

interface ConnectionTypeSelectorProps {
  selectedType: ConnectionType;
  onSelect: (type: ConnectionType) => void;
}

const CONNECTION_TYPES: ConnectionType[] = ['follows', 'depends-on', 'extends', 'references', 'contradicts'];

export function ConnectionTypeSelector({ selectedType, onSelect }: ConnectionTypeSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-slate-400">
        Connection Type
      </label>
      <div className="grid grid-cols-2 gap-2">
        {CONNECTION_TYPES.map(type => {
          const isSelected = selectedType === type;
          const color = CONNECTION_TYPE_COLORS[type];
          
          return (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className={`
                px-3 py-2 rounded text-xs font-medium transition-all
                ${isSelected 
                  ? 'ring-2 ring-offset-1 ring-offset-slate-900' 
                  : 'opacity-60 hover:opacity-100'}
              `}
              style={{ 
                backgroundColor: isSelected ? color : `${color}33`,
                borderColor: color,
                borderWidth: 1,
                color: isSelected ? 'white' : color,
              }}
            >
              {CONNECTION_TYPE_LABELS[type]}
            </button>
          );
        })}
      </div>
    </div>
  );
}