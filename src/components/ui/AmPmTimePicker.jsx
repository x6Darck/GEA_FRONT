import React, { useState, useEffect } from 'react';

const AmPmTimePicker = ({ value, onChange, disabled }) => {
  // Parse initial 24h value to 12h states
  const parseTime = (val) => {
    if (!val) return { h: '12', m: '00', ampm: 'AM' };
    let h24, m;
    if (Array.isArray(val)) {
      [h24, m] = val;
    } else if (typeof val === 'string') {
      [h24, m] = val.split(':');
    } else {
      return { h: '12', m: '00', ampm: 'AM' };
    }
    let h = parseInt(h24, 10);
    const mStr = String(m || '00').padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return { h: String(h).padStart(2, '0'), m: mStr, ampm };
  };

  const initial = parseTime(value);
  const [hour, setHour] = useState(initial.h);
  const [minute, setMinute] = useState(initial.m);
  const [ampm, setAmpm] = useState(initial.ampm);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    const parsed = parseTime(value);
    setHour(parsed.h);
    setMinute(parsed.m);
    setAmpm(parsed.ampm);
  }, [value]);

  const updateTime = (newH, newM, newAmpm) => {
    let h24 = parseInt(newH, 10);
    if (newAmpm === 'PM' && h24 < 12) h24 += 12;
    if (newAmpm === 'AM' && h24 === 12) h24 = 0;
    
    const formatted24h = `${String(h24).padStart(2, '0')}:${newM}:00`;
    if (onChange) {
      // Simulate event
      onChange({ target: { name: 'time', value: formatted24h } }, formatted24h); 
    }
  };

  const handleHourChange = (e) => {
    const val = e.target.value;
    setHour(val);
    updateTime(val, minute, ampm);
  };

  const handleMinuteChange = (e) => {
    const val = e.target.value;
    setMinute(val);
    updateTime(hour, val, ampm);
  };

  const handleAmpmChange = (e) => {
    const val = e.target.value;
    setAmpm(val);
    updateTime(hour, minute, val);
  };

  return (
    <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
      <select 
         value={hour} 
         onChange={handleHourChange}
         disabled={disabled}
         style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: disabled ? '#f1f5f9' : 'white', cursor: disabled ? 'not-allowed' : 'pointer' }}
      >
        {Array.from({length: 12}, (_, i) => i + 1).map(h => (
          <option key={h} value={String(h).padStart(2, '0')}>{String(h).padStart(2, '0')}</option>
        ))}
      </select>
      
      <span style={{ fontWeight: 'bold', color: '#64748b' }}>:</span>
      
      <select 
         value={minute} 
         onChange={handleMinuteChange}
         disabled={disabled}
         style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: disabled ? '#f1f5f9' : 'white', cursor: disabled ? 'not-allowed' : 'pointer' }}
      >
        {['00', '15', '30', '45'].map(m => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
      
      <select 
         value={ampm} 
         onChange={handleAmpmChange}
         disabled={disabled}
         style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: disabled ? '#f1f5f9' : 'white', cursor: disabled ? 'not-allowed' : 'pointer' }}
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
};

export default AmPmTimePicker;
