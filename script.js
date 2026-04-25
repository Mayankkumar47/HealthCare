(function () {
  const $ = id => document.getElementById(id);

  // Helper: Basic Auth
  function basicAuthHeader(user, pass) {
    return 'Basic ' + btoa(user + ':' + pass);
  }

  // Helper: Badge Colors
  function badgeClass(status) {
    if (!status) return 'badge-default';
    const s = status.toLowerCase();
    if (s === 'normal') return 'badge-normal';
    if (s === 'good') return 'badge-good';
    if (s === 'under observation' || s === 'average') return 'badge-average';
    if (s === 'bad' || s.includes('abnormal') || s.includes('concern')) return 'badge-bad';
    return 'badge-default';
  }

  let bpChart = null;

  // Render Chart
  function initChart(labels, sysData, diaData) {
    const canvas = $('bpChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (bpChart) bpChart.destroy();

    bpChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Systolic',
            data: sysData,
            borderColor: '#C26EB4',
            backgroundColor: 'rgba(194,110,180,0.15)',
            pointBackgroundColor: '#C26EB4',
            pointRadius: 5,
            borderWidth: 2.5,
            tension: 0.4,
            fill: true,
          },
          {
            label: 'Diastolic',
            data: diaData,
            borderColor: '#7DBFEA',
            backgroundColor: 'rgba(125,191,234,0.10)',
            pointBackgroundColor: '#7DBFEA',
            pointRadius: 5,
            borderWidth: 2.5,
            tension: 0.4,
            fill: true,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { family: 'Manrope', size: 11 } } },
          y: { min: 60, max: 180, ticks: { font: { family: 'Manrope', size: 11 } } }
        }
      }
    });
  }

  // Render Sidebar List
  function renderPatientList(patients, activeIndex) {
    const container = $('patientsList');
    if (!container) return;
    
    container.innerHTML = patients.map((p, i) => `
      <div class="pt-item ${i === activeIndex ? 'active' : ''}">
        <img src="${p.profile_picture || 'https://via.placeholder.co/44'}" alt="${p.name}" loading="lazy"/>
        <div class="pt-info">
          <div class="pt-name">${p.name}</div>
          <div class="pt-sub">${p.gender}, ${p.age}</div>
        </div>
        <button class="pt-more" title="More">···</button>
      </div>
    `).join('');
  }

  // Render Main Dashboard Data
  function renderPatient(patient) {
    // 1. Profile Info
    $('profileImg').src = patient.profile_picture || 'https://via.placeholder.co/100';
    $('profileName').textContent = patient.name;
    $('profDob').textContent = patient.date_of_birth || '—';
    $('profGender').textContent = patient.gender || '—';
    $('profPhone').textContent = patient.phone_number || '—';
    $('profEmergency').textContent = patient.emergency_contact || '—';
    $('profInsurance').textContent = patient.insurance_type || '—';

    // 2. Chart & Vitals Data
    const history = patient.diagnosis_history || [];
    const recent = history.slice(-6).reverse();
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    const labels = recent.map(h => `${months[parseInt(h.month, 10) - 1] || h.month}, ${String(h.year).slice(-2)}`);
    const sysData = recent.map(h => h.blood_pressure?.systolic?.value ?? 0);
    const diaData = recent.map(h => h.blood_pressure?.diastolic?.value ?? 0);

    initChart(labels, sysData, diaData);

    const latest = history[history.length - 1];
    if (latest) {
      const sys = latest.blood_pressure?.systolic;
      const dia = latest.blood_pressure?.diastolic;
      
      $('sysVal').textContent = sys?.value ?? '—';
      $('diaVal').textContent = dia?.value ?? '—';

      const sysUp = (sys?.levels || '').toLowerCase().includes('higher');
      const diaUp = (dia?.levels || '').toLowerCase().includes('higher');

      const arrowUp = '<polyline points="0,8 5,2 10,8" stroke="currentColor" stroke-width="1.5"/>';
      const arrowDown = '<polyline points="0,2 5,8 10,2" stroke="currentColor" stroke-width="1.5"/>';

      $('sysTrend').innerHTML = `<svg viewBox="0 0 10 10" fill="none">${sysUp ? arrowUp : arrowDown}</svg><span>${sys?.levels || 'Normal'}</span>`;
      $('diaTrend').innerHTML = `<svg viewBox="0 0 10 10" fill="none">${diaUp ? arrowUp : arrowDown}</svg><span>${dia?.levels || 'Normal'}</span>`;

      $('respVal').textContent = latest.respiratory_rate?.value ?? '—';
      $('respStatus').textContent = latest.respiratory_rate?.levels ?? 'Normal';
      $('tempVal').textContent = latest.temperature?.value ?? '—';
      $('tempStatus').textContent = latest.temperature?.levels ?? 'Normal';
      $('heartVal').textContent = latest.heart_rate?.value ?? '—';
      $('heartStatus').textContent = latest.heart_rate?.levels ?? 'Normal';
    }

    // 3. Diagnostic List
    const diagList = patient.diagnostic_list || [];
    $('diagTableBody').innerHTML = diagList.length === 0 
      ? '<tr><td colspan="3" style="text-align:center">No data available.</td></tr>'
      : diagList.map(d => `
          <tr>
            <td style="font-weight:700">${d.name || '—'}</td>
            <td style="color:var(--muted)">${d.description || '—'}</td>
            <td><span class="badge ${badgeClass(d.status)}">${d.status || '—'}</span></td>
          </tr>
        `).join('');

    // 4. Lab Results
    const labs = patient.lab_results || [];
    $('labList').innerHTML = labs.length === 0 
      ? '<p>No lab results available.</p>'
      : labs.map(lab => `
          <div class="lab-item">
            <span class="lab-name">${lab}</span>
            <button class="dl-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
          </div>
        `).join('');
  }

  // Fetch API
  async function fetchData() {
    const API_URL = 'https://fedskillstest.coalitiontechnologies.workers.dev';
    const response = await fetch(API_URL, {
      method: 'GET',
      headers: {
        'Authorization': basicAuthHeader('coalition', 'skills-test'),
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  // Initialization
  async function init() {
    const loader = $('loader');
    try {
      const patients = await fetchData();
      
      // Find Jessica Taylor, default to 0 if not found
      const jessicaIndex = Math.max(0, patients.findIndex(p => p.name === 'Jessica Taylor'));
      
      renderPatientList(patients, jessicaIndex);
      renderPatient(patients[jessicaIndex]);
      
      // Fade out loader on success
      if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 500);
      }
    } catch (err) {
      console.error('Data Fetch Error:', err);
      // Professional UI Error Handling
      if (loader) {
        loader.innerHTML = `
          <div style="text-align:center; color:#C23B3B;">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <h3 style="margin-top:10px;">Connection Error</h3>
            <p style="color:var(--text); font-size:14px; margin-top:5px;">Unable to load patient data from the server. Please check your network or try again later.</p>
          </div>
        `;
        loader.style.background = '#FFF3D4'; // Light warning background
      }
    }
  }

  // Start app
  init();
})();