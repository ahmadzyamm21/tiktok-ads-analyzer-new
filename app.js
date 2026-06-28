window.addEventListener('error', function(e) {
    const msg = e.message + ' (' + e.filename + ':' + e.lineno + ')';
    console.error('Global JS Error:', msg);
    alert('Sistem mendeteksi error pada browser Anda:\n\n' + msg + '\n\nSilakan salin/laporkan pesan ini.');
});

document.addEventListener('DOMContentLoaded', () => {
    // App State
    let campaigns = [];
    let products = [];
    let dailyLogs = [];
    let charts = {};

    try {
        campaigns = JSON.parse(localStorage.getItem('tiktok_campaigns')) || [];
    } catch(e) {
        console.error("Failed to parse campaigns, resetting.", e);
    }
    try {
        products = JSON.parse(localStorage.getItem('tiktok_products')) || [];
    } catch(e) {
        console.error("Failed to parse products, resetting.", e);
    }
    try {
        dailyLogs = JSON.parse(localStorage.getItem('tiktok_daily_logs')) || [];
    } catch(e) {
        console.error("Failed to parse daily logs, resetting.", e);
    }

    // Sanitize Campaigns
    if (!Array.isArray(campaigns)) {
        campaigns = [];
    } else {
        campaigns = campaigns.map(c => {
            if (!c || typeof c !== 'object') return null;
            return {
                id: c.id || 'camp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                name: c.name || 'Unnamed Campaign',
                productId: c.productId || '',
                spend: parseFloat(c.spend) || 0,
                impressions: parseInt(c.impressions) || 0,
                clicks: parseInt(c.clicks) || 0,
                orders: parseInt(c.orders) || 0,
                gmv: parseFloat(c.gmv) || 0,
                targetRoas: parseFloat(c.targetRoas) || 2.5
            };
        }).filter(Boolean);
    }

    // Sanitize Products
    if (!Array.isArray(products)) {
        products = [];
    } else {
        products = products.map(p => {
            if (!p || typeof p !== 'object') return null;
            return {
                id: p.id || 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                name: p.name || 'Unnamed Product',
                price: parseFloat(p.price) || 0,
                hpp: parseFloat(p.hpp) || 0,
                marketplaceFee: p.marketplaceFee !== undefined ? parseFloat(p.marketplaceFee) : 4.0,
                dynamicCommission: p.dynamicCommission !== undefined ? parseFloat(p.dynamicCommission) : 2.0,
                affiliateFee: p.affiliateFee !== undefined ? parseFloat(p.affiliateFee) : 0.0,
                sapFee: p.sapFee !== undefined ? parseFloat(p.sapFee) : 0.0,
                growthXtraFee: p.growthXtraFee !== undefined ? parseFloat(p.growthXtraFee) : 0.0,
                serviceFee: p.serviceFee !== undefined ? parseFloat(p.serviceFee) : 1250,
                logisticCost: p.logisticCost !== undefined ? parseFloat(p.logisticCost) : 3000,
                otherCost: parseFloat(p.otherCost) || 0,
                voucherType: p.voucherType || 'none',
                voucherVal: parseFloat(p.voucherVal) || 0,
                voucherRp: parseFloat(p.voucherRp) || 0,
                netMargin: parseFloat(p.netMargin) || 0,
                marginPct: parseFloat(p.marginPct) || 0,
                beRoas: parseFloat(p.beRoas) || 2.0
            };
        }).filter(Boolean);
    }

    // Sanitize Daily Logs
    if (!Array.isArray(dailyLogs)) {
        dailyLogs = [];
    } else {
        dailyLogs = dailyLogs.map(log => {
            if (!log || typeof log !== 'object') return null;
            return {
                id: log.id || 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                date: log.date || new Date().toISOString().split('T')[0],
                productId: log.productId || '',
                spend: parseFloat(log.spend) || 0,
                gmv: parseFloat(log.gmv) || 0,
                orders: parseFloat(log.orders) || 0
            };
        }).filter(Boolean);
    }

    // DOM Elements
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');
    const pageTitle = document.getElementById('page-title');
    const pageDescription = document.getElementById('page-description');
    
    // Toast Notification
    const toast = document.getElementById('toast');
    const toastMessage = toast.querySelector('.toast-message');

    // Tab Navigation logic
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = item.getAttribute('data-tab');
            
            // Set active class in menu
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Toggle tab content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `tab-${tabId}`) {
                    content.classList.add('active');
                }
            });

            // Update Header Title & Description
            updateHeader(tabId);
            
            // Re-render simulator curve chart if moving to simulator tab
            if (tabId === 'simulator') {
                setTimeout(updateSimulator, 50);
            }
            if (tabId === 'daily') {
                setTimeout(updateDailyChart, 50);
            }
        });
    });

    function updateHeader(tabId) {
        switch (tabId) {
            case 'dashboard':
                pageTitle.textContent = 'Dashboard Overview';
                pageDescription.textContent = 'Analisis performa iklan TikTok Shop GMV Max & optimasi ROAS.';
                break;
            case 'products':
                pageTitle.textContent = 'Kalkulator HPP & Profit Produk';
                pageDescription.textContent = 'Kelola harga modal (HPP) produk, biaya admin TikTok Shop, dan hitung target ROAS impas Anda.';
                break;
            case 'simulator':
                pageTitle.textContent = 'Max ROAS Bidding Simulator';
                pageDescription.textContent = 'Simulasikan strategi bidding dan penyesuaian Target ROAS Anda.';
                break;
            case 'daily':
                pageTitle.textContent = 'Analisis Iklan Harian';
                pageDescription.textContent = 'Catat, evaluasi, dan pantau tren performa pengeluaran iklan & laba bersih harian Anda.';
                break;
            case 'batch-analyzer':
                pageTitle.textContent = 'Batch Campaign Analyzer';
                pageDescription.textContent = 'Unggah data CSV atau masukkan secara manual untuk analisis multi-kampanye.';
                break;
            case 'recommendations':
                pageTitle.textContent = 'TikTok Shop Diagnostics';
                pageDescription.textContent = 'Rekomendasi taktis untuk mengoptimalkan Halaman Produk dan Kreatif Iklan.';
                break;
        }
    }

    // Helper functions
    function showToast(message, type = 'info') {
        toastMessage.textContent = message;
        
        // Icon matching
        const icon = toast.querySelector('i');
        icon.className = 'fas toast-icon';
        if (type === 'success') {
            icon.classList.add('fa-check-circle', 'text-green');
            toast.style.borderColor = 'var(--accent-green)';
        } else if (type === 'error') {
            icon.classList.add('fa-exclamation-circle', 'text-pink');
            toast.style.borderColor = 'var(--accent-pink)';
        } else {
            icon.classList.add('fa-info-circle', 'text-cyan');
            toast.style.borderColor = 'var(--accent-cyan)';
        }

        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    function formatRupiah(number) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(number);
    }

    function formatNumber(number, decimals = 0) {
        return new Intl.NumberFormat('id-ID', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(number);
    }

    // Calculator & Simulator Logic
    const simInputs = {
        hpp: document.getElementById('sim-input-hpp'),
        spend: document.getElementById('sim-input-spend'),
        cpc: document.getElementById('sim-input-cpc'),
        cvr: document.getElementById('sim-input-cvr'),
        aov: document.getElementById('sim-input-aov'),
        targetRoas: document.getElementById('sim-input-target-roas'),
        megaSale: document.getElementById('sim-input-mega-sale'),
        includePpn: document.getElementById('sim-input-include-ppn')
    };
    const rangeValTargetRoas = document.getElementById('range-val-target-roas');

    function saveSimulatorInputsToStorage() {
        const simData = {
            hpp: simInputs.hpp ? simInputs.hpp.value : '',
            spend: simInputs.spend ? simInputs.spend.value : '',
            cpc: simInputs.cpc ? simInputs.cpc.value : '',
            cvr: simInputs.cvr ? simInputs.cvr.value : '',
            aov: simInputs.aov ? simInputs.aov.value : '',
            targetRoas: simInputs.targetRoas ? simInputs.targetRoas.value : '',
            megaSale: simInputs.megaSale ? simInputs.megaSale.checked : false,
            includePpn: simInputs.includePpn ? simInputs.includePpn.checked : false,
            productId: (typeof simSelectProduct !== 'undefined' && simSelectProduct) ? simSelectProduct.value : ''
        };
        localStorage.setItem('tiktok_sim_data', JSON.stringify(simData));
    }

    function loadSimulatorInputsFromStorage() {
        const saved = localStorage.getItem('tiktok_sim_data');
        if (saved) {
            try {
                const simData = JSON.parse(saved);
                
                if (typeof simSelectProduct !== 'undefined' && simSelectProduct && simData.productId) {
                    simSelectProduct.value = simData.productId;
                    if (simInputs.aov) simInputs.aov.readOnly = true;
                    if (simInputs.hpp) simInputs.hpp.readOnly = true;
                    if (simInputs.aov) simInputs.aov.style.opacity = '0.7';
                    if (simInputs.hpp) simInputs.hpp.style.opacity = '0.7';
                }
                
                if (simInputs.hpp && simData.hpp) simInputs.hpp.value = simData.hpp;
                if (simInputs.spend && simData.spend) simInputs.spend.value = simData.spend;
                if (simInputs.cpc && simData.cpc) simInputs.cpc.value = simData.cpc;
                if (simInputs.cvr && simData.cvr) simInputs.cvr.value = simData.cvr;
                if (simInputs.aov && simData.aov) simInputs.aov.value = simData.aov;
                if (simInputs.megaSale && simData.hasOwnProperty('megaSale')) {
                    simInputs.megaSale.checked = simData.megaSale;
                }
                if (simInputs.includePpn && simData.hasOwnProperty('includePpn')) {
                    simInputs.includePpn.checked = simData.includePpn;
                }
                if (simInputs.targetRoas && simData.targetRoas) {
                    simInputs.targetRoas.value = simData.targetRoas;
                    if (rangeValTargetRoas) {
                        rangeValTargetRoas.textContent = parseFloat(simData.targetRoas).toFixed(1) + 'x';
                    }
                }
            } catch (e) {
                console.error('Error loading simulator data:', e);
            }
        }
    }

    // Attach simulator events
    Object.values(simInputs).forEach(input => {
        if (input) {
            const eventType = input.type === 'checkbox' ? 'change' : 'input';
            input.addEventListener(eventType, () => {
                if (input.id === 'sim-input-target-roas' && rangeValTargetRoas) {
                    rangeValTargetRoas.textContent = parseFloat(input.value).toFixed(1) + 'x';
                }
                saveSimulatorInputsToStorage();
                updateSimulator();
            });
        }
    });

    const scaleInputSpend = document.getElementById('scale-input-spend');
    const scaleInputDecay = document.getElementById('scale-input-decay');
    if (scaleInputSpend) {
        scaleInputSpend.addEventListener('input', updateScalingCalculator);
    }
    if (scaleInputDecay) {
        scaleInputDecay.addEventListener('input', updateScalingCalculator);
    }

    function updateSimulator() {
        const aov = simInputs.aov ? (parseFloat(simInputs.aov.value) || 0) : 0;
        const hpp = simInputs.hpp ? (parseFloat(simInputs.hpp.value) || 0) : 0;
        const plannedSpend = simInputs.spend ? (parseFloat(simInputs.spend.value) || 0) : 0;
        let cpc = simInputs.cpc ? (parseFloat(simInputs.cpc.value) || 500) : 500;
        let cvr = simInputs.cvr ? (parseFloat(simInputs.cvr.value) / 100 || 0.01) : 0.01;
        const targetRoasSet = simInputs.targetRoas ? (parseFloat(simInputs.targetRoas.value) || 2.5) : 2.5;

        // Apply Mega-Sale multipliers
        const isMegaSale = simInputs.megaSale ? simInputs.megaSale.checked : false;
        if (isMegaSale) {
            cvr = cvr * 1.8;
            cpc = cpc * 1.3;
        }

        // Calculate margin % dynamically
        let margin = 0.4; // fallback 40%
        const selectedId = (typeof simSelectProduct !== 'undefined' && simSelectProduct) ? simSelectProduct.value : '';
        if (selectedId) {
            const p = products.find(prod => prod.id === selectedId);
            if (p) {
                margin = p.marginPct / 100;
            }
        } else {
            // Est. TikTok admin fees (8% AOV) + est. logistic cost (Rp 3000)
            const estFees = (aov * 0.08) + 3000;
            const netMargin = aov - hpp - estFees;
            margin = aov > 0 ? Math.max(0.01, netMargin / aov) : 0.01;
        }

        // Clicks = Spend / CPC
        const maxClicks = plannedSpend / cpc;
        const maxOrders = maxClicks * cvr;
        const maxGmv = maxOrders * aov;
        const naturalRoas = maxGmv / plannedSpend;

        // Model Delivery Rate based on Target ROAS Set vs Natural ROAS
        let deliveryFactor = 1.0;
        if (targetRoasSet > naturalRoas) {
            deliveryFactor = Math.pow(naturalRoas / targetRoasSet, 2.0);
        } else {
            deliveryFactor = Math.min(1.2, 1.0 + (naturalRoas - targetRoasSet) * 0.05);
        }
        
        deliveryFactor = Math.max(0.05, deliveryFactor);

        const actualSpend = plannedSpend * deliveryFactor;
        const actualClicks = actualSpend / cpc;
        const actualOrders = actualClicks * cvr;
        
        const qualityBoost = 1.0 + (1.0 - deliveryFactor) * 0.15; 
        const simulatedGmv = actualOrders * qualityBoost * aov;
        const simulatedRoas = simulatedGmv / actualSpend;
        
        const breakEvenRoas = 1 / margin;
        const grossProfit = simulatedGmv * margin;
        
        const isPpnActive = simInputs.includePpn ? simInputs.includePpn.checked : false;
        let netProfit = grossProfit - actualSpend;
        
        const ppnBreakdownBox = document.getElementById('sim-ppn-breakdown-box');
        if (ppnBreakdownBox) {
            if (isPpnActive) {
                const ppnTax = actualSpend * 0.11;
                const totalCashSpend = actualSpend + ppnTax;
                netProfit = grossProfit - totalCashSpend;
                const roasNet = totalCashSpend > 0 ? simulatedGmv / totalCashSpend : 0;
                
                document.getElementById('sim-ppn-spend-ads').textContent = formatRupiah(actualSpend);
                document.getElementById('sim-ppn-tax').textContent = `+ ${formatRupiah(ppnTax)}`;
                document.getElementById('sim-ppn-spend-total').textContent = formatRupiah(totalCashSpend);
                document.getElementById('sim-ppn-roas-net').textContent = roasNet.toFixed(2) + 'x';
                
                ppnBreakdownBox.style.display = 'block';
            } else {
                ppnBreakdownBox.style.display = 'none';
            }
        }

        // Update KPI displays
        document.getElementById('sim-val-gmv').textContent = formatRupiah(simulatedGmv);
        
        const roasEl = document.getElementById('sim-val-roas');
        roasEl.textContent = simulatedRoas.toFixed(2) + 'x';
        if (simulatedRoas >= breakEvenRoas) {
            roasEl.className = 'kpi-value text-glow-cyan text-cyan';
        } else {
            roasEl.className = 'kpi-value text-glow-pink text-pink';
        }

        document.getElementById('sim-val-be-roas').textContent = breakEvenRoas.toFixed(2) + 'x';
        
        const profitEl = document.getElementById('sim-val-profit');
        profitEl.textContent = formatRupiah(netProfit);
        if (netProfit >= 0) {
            profitEl.style.color = 'var(--accent-green)';
        } else {
            profitEl.style.color = 'var(--accent-pink)';
        }

        // Bidding strategy recommendation text (Verdict)
        const verdictBox = document.getElementById('sim-verdict-box');
        const verdictTitle = document.getElementById('sim-verdict-title');
        const verdictDesc = document.getElementById('sim-verdict-desc');

        if (targetRoasSet > naturalRoas + 1.5) {
            verdictBox.className = 'simulator-verdict alert-danger';
            verdictTitle.textContent = 'Peringatan: Target ROAS Terlalu Tinggi (Under-delivering)';
            verdictDesc.textContent = `Target ROAS Anda (${targetRoasSet.toFixed(1)}x) berada jauh di atas kemampuan alami produk (${naturalRoas.toFixed(2)}x). TikTok kemungkinan besar akan membatasi pemakaian budget Anda hingga ${formatNumber((1 - deliveryFactor) * 100)}% (hanya menghabiskan sekitar ${formatRupiah(actualSpend)} dari budget). Saran: Turunkan Target ROAS ke angka ${Math.max(1, (naturalRoas + 0.2).toFixed(1))}x untuk mempercepat pengiriman iklan.`;
        } else if (simulatedRoas < breakEvenRoas) {
            verdictBox.className = 'simulator-verdict alert-danger';
            verdictTitle.textContent = 'Peringatan: Kampanye Rugi (Unprofitable)';
            verdictDesc.textContent = `ROAS Proyeksi Anda (${simulatedRoas.toFixed(2)}x) berada di bawah Break-Even ROAS (${breakEvenRoas.toFixed(2)}x) untuk produk dengan margin ${(margin*100).toFixed(1)}%. Anda akan mengalami kerugian sekitar ${formatRupiah(Math.abs(netProfit))}. Saran: Jangan naikkan budget. Fokus pada menaikkan CVR toko Anda ke ${( (breakEvenRoas * actualSpend) / (actualClicks * aov) * 100 ).toFixed(2)}% atau menaikkan AOV untuk meningkatkan keuntungan alami.`;
        } else if (targetRoasSet < naturalRoas - 0.5) {
            verdictBox.className = 'simulator-verdict';
            verdictTitle.textContent = 'Strategi Bidding Aman: Scaling Zone!';
            verdictDesc.textContent = `Target ROAS Anda diset cukup konservatif (${targetRoasSet.toFixed(1)}x), di bawah ROAS alami (${naturalRoas.toFixed(2)}x). Iklan Anda akan menghabiskan budget dengan sangat lancar dan memberikan profit bersih ${formatRupiah(netProfit)}. Anda bisa menaikkan budget harian secara bertahap (15-20% per hari) atau menaikkan sedikit Target ROAS untuk mendapatkan pelanggan berkualitas lebih tinggi.`;
        } else {
            verdictBox.className = 'simulator-verdict';
            verdictTitle.textContent = 'Bidding Teroptimasi';
            verdictDesc.textContent = `Pengaturan Target ROAS (${targetRoasSet.toFixed(1)}x) berada pada titik manis yang cukup mendekati ROAS alami. Penyerapan anggaran stabil (${formatNumber(deliveryFactor * 100)}%) dengan keuntungan bersih optimal sebesar ${formatRupiah(netProfit)}. Pertahankan pengaturan ini dan pantau secara berkala.`;
        }

        // Draw curves in Simulator Chart
        drawSimulatorCurves(naturalRoas, plannedSpend, margin, cpc, cvr, aov);
        
        // Update scaling calculator
        updateScalingCalculator();
    }

    function updateScalingCalculator() {
        const inputSpend = document.getElementById('scale-input-spend');
        const inputDecay = document.getElementById('scale-input-decay');
        const rangeValDecay = document.getElementById('range-val-scale-decay');
        
        const valGmv = document.getElementById('scale-val-gmv');
        const valProfit = document.getElementById('scale-val-profit');
        const valRoi = document.getElementById('scale-val-roi');
        
        const badge = document.getElementById('scale-verdict-badge');
        const box = document.getElementById('scale-verdict-box');
        const icon = document.getElementById('scale-verdict-icon');
        const text = document.getElementById('scale-verdict-text');
        
        if (!inputSpend || !inputDecay) return;
        
        const targetSpend = parseFloat(inputSpend.value) || 0;
        const decayPct = parseFloat(inputDecay.value) || 0;
        
        if (rangeValDecay) {
            rangeValDecay.textContent = decayPct + '%';
        }
        
        const aov = simInputs.aov ? (parseFloat(simInputs.aov.value) || 0) : 0;
        const hpp = simInputs.hpp ? (parseFloat(simInputs.hpp.value) || 0) : 0;
        let cpc = simInputs.cpc ? (parseFloat(simInputs.cpc.value) || 500) : 500;
        let cvr = simInputs.cvr ? (parseFloat(simInputs.cvr.value) / 100 || 0.01) : 0.01;
        
        const isMegaSale = simInputs.megaSale ? simInputs.megaSale.checked : false;
        if (isMegaSale) {
            cvr = cvr * 1.8;
            cpc = cpc * 1.3;
        }

        const originalRoas = (cvr * aov) / cpc;
        const scaledRoas = Math.max(0.5, originalRoas * (1 - (decayPct / 100)));
        const estimatedGmv = targetSpend * scaledRoas;
        const estimatedOrders = aov > 0 ? (estimatedGmv / aov) : 0;
        
        let netMargin = aov - hpp;
        const selectProductEl = document.getElementById('sim-select-product');
        if (selectProductEl && selectProductEl.value && Array.isArray(products)) {
            const prod = products.find(p => p.id === selectProductEl.value);
            if (prod) {
                netMargin = getProductNetMargin(prod);
            }
        }
        
        const estimatedProfit = (estimatedOrders * netMargin) - targetSpend;
        const roi = targetSpend > 0 ? (estimatedProfit / targetSpend * 100) : 0;
        
        if (valGmv) valGmv.textContent = formatRupiah(estimatedGmv);
        if (valProfit) {
            valProfit.textContent = formatRupiah(estimatedProfit);
            valProfit.style.color = estimatedProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-pink)';
        }
        if (valRoi) {
            valRoi.textContent = roi.toFixed(1) + '%';
            valRoi.style.color = roi >= 0 ? 'var(--accent-green)' : 'var(--accent-pink)';
        }
        
        if (estimatedProfit >= 0) {
            if (badge) {
                badge.textContent = 'Ready to Scale';
                badge.className = 'badge badge-green';
            }
            if (box) {
                box.style.background = 'rgba(0, 255, 135, 0.05)';
                box.style.borderLeftColor = 'var(--accent-green)';
            }
            if (icon) {
                icon.className = 'fas fa-check-circle';
                icon.style.color = 'var(--accent-green)';
            }
            if (text) {
                text.textContent = `Scaling direkomendasikan! Hasil estimasi profit bersih bernilai positif. ROI diproyeksikan sebesar ${roi.toFixed(1)}%.`;
            }
        } else {
            if (badge) {
                badge.textContent = 'High Risk';
                badge.className = 'badge badge-pink';
            }
            if (box) {
                box.style.background = 'rgba(254, 44, 85, 0.05)';
                box.style.borderLeftColor = 'var(--accent-pink)';
            }
            if (icon) {
                icon.className = 'fas fa-exclamation-triangle';
                icon.style.color = 'var(--accent-pink)';
            }
            if (text) {
                text.textContent = `Scaling berisiko tinggi! Estimasi rugi bersih sebesar ${formatRupiah(Math.abs(estimatedProfit))} karena penurunan ROAS. Coba kurangi budget baru atau naikkan AOV/harga jual.`;
            }
        }
    }

    function drawSimulatorCurves(naturalRoas, plannedSpend, margin, cpc, cvr, aov) {
        const ctx = document.getElementById('chart-sim-curves').getContext('2d');
        
        // Generate X points (Target ROAS from 1.0 to 8.0)
        const labels = [];
        const deliveryData = [];
        const profitData = [];
        
        for (let t = 1.0; t <= 8.0; t += 0.5) {
            labels.push(t.toFixed(1) + 'x');
            
            // Calculate metrics for this specific target ROAS
            let df = 1.0;
            if (t > naturalRoas) {
                df = Math.pow(naturalRoas / t, 2.0);
            } else {
                df = Math.min(1.2, 1.0 + (naturalRoas - t) * 0.05);
            }
            df = Math.max(0.05, df);
            
            const spend = plannedSpend * df;
            const clicks = spend / cpc;
            const orders = clicks * cvr;
            const qBoost = 1.0 + (1.0 - df) * 0.15;
            const gmv = orders * qBoost * aov;
            const netProfit = (gmv * margin) - spend;
            
            deliveryData.push(df * 100);
            profitData.push(netProfit / 1000); // in thousands (K IDR)
        }

        if (charts.simCurves) {
            charts.simCurves.destroy();
        }

        charts.simCurves = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Laju Pengiriman Budget (Spend %)',
                        data: deliveryData,
                        borderColor: '#25F4EE',
                        backgroundColor: 'rgba(37, 244, 238, 0.05)',
                        borderWidth: 2,
                        yAxisID: 'y-spend',
                        tension: 0.3,
                        pointRadius: 4,
                        pointBackgroundColor: '#25F4EE'
                    },
                    {
                        label: 'Proyeksi Profit Bersih (Ribu Rp)',
                        data: profitData,
                        borderColor: '#FE2C55',
                        backgroundColor: 'rgba(254, 44, 85, 0.05)',
                        borderWidth: 2,
                        yAxisID: 'y-profit',
                        tension: 0.3,
                        pointRadius: 4,
                        pointBackgroundColor: '#FE2C55'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#90A0B7',
                            font: { family: 'Outfit', size: 12 }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#90A0B7', font: { family: 'Outfit' } },
                        grid: { color: 'rgba(255, 255, 255, 0.05)' }
                    },
                    'y-spend': {
                        type: 'linear',
                        position: 'left',
                        title: { display: true, text: 'Spend %', color: '#25F4EE', font: { family: 'Outfit', weight: 'bold' } },
                        ticks: { color: '#90A0B7', callback: value => value + '%' },
                        grid: { color: 'rgba(255, 255, 255, 0.05)' }
                    },
                    'y-profit': {
                        type: 'linear',
                        position: 'right',
                        title: { display: true, text: 'Net Profit (Ribu Rp)', color: '#FE2C55', font: { family: 'Outfit', weight: 'bold' } },
                        ticks: { 
                            color: '#90A0B7',
                            callback: value => {
                                if (value >= 1000) return 'Rp ' + (value / 1000).toFixed(1) + 'M';
                                return 'Rp ' + value + 'k';
                            }
                        },
                        grid: { drawOnChartArea: false } // Only show grid for left axis
                    }
                }
            }
        });
    }

    // Batch Campaign Parser & Form logic
    const addCampaignForm = document.getElementById('add-campaign-form');
    const btnClearTable = document.getElementById('btn-clear-table');
    const btnExportCsv = document.getElementById('btn-export-csv');
    const campaignsTableBody = document.getElementById('campaigns-table-body');
    const csvDropzone = document.getElementById('csv-dropzone');
    const csvFileInput = document.getElementById('csv-file-input');

    addCampaignForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = document.getElementById('add-camp-name').value.trim();
        const spend = parseFloat(document.getElementById('add-camp-spend').value) || 0;
        const clicks = parseInt(document.getElementById('add-camp-clicks').value) || 0;
        const impressions = parseInt(document.getElementById('add-camp-impressions').value) || 0;
        const orders = parseInt(document.getElementById('add-camp-orders').value) || 0;
        const gmv = parseFloat(document.getElementById('add-camp-gmv').value) || 0;
        const targetRoas = parseFloat(document.getElementById('add-camp-target-roas').value) || 2.5;

        if (clicks > impressions) {
            showToast('Clicks tidak boleh melebihi Impressions!', 'error');
            return;
        }
        if (orders > clicks) {
            showToast('Orders tidak boleh melebihi Clicks!', 'error');
            return;
        }

        const productId = document.getElementById('add-camp-product').value;
        const newCampaign = {
            id: 'camp_' + Date.now(),
            name,
            spend,
            impressions,
            clicks,
            orders,
            gmv,
            targetRoas,
            productId: productId || null
        };

        campaigns.push(newCampaign);
        addCampaignForm.reset();
        document.getElementById('add-camp-product').value = ""; // Reset product dropdown
        
        saveCampaignsToStorage();
        updateAppState();
        showToast('Kampanye berhasil ditambahkan!', 'success');
    });

    btnClearTable.addEventListener('click', () => {
        if (campaigns.length === 0) return;
        
        if (confirm('Apakah Anda yakin ingin menghapus semua data kampanye?')) {
            campaigns = [];
            saveCampaignsToStorage();
            updateAppState();
            showToast('Semua data berhasil dibersihkan.', 'success');
        }
    });

    btnExportCsv.addEventListener('click', () => {
        if (campaigns.length === 0) {
            showToast('Tidak ada data untuk diekspor.', 'error');
            return;
        }
        
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Campaign Name,Spend,Impressions,Clicks,CTR (%),CPC (Rp),Orders,CVR (%),GMV (Rp),Actual ROAS,Target ROAS,Status\n";
        
        campaigns.forEach(c => {
            const ctr = (c.clicks / c.impressions * 100).toFixed(2);
            const cvr = (c.orders / c.clicks * 100).toFixed(2);
            const cpc = (c.spend / c.clicks).toFixed(0);
            const cpa = c.orders > 0 ? (c.spend / c.orders).toFixed(0) : 0;
            const roas = (c.gmv / c.spend).toFixed(2);
            const status = determineStatus(c);
            
            csvContent += `"${c.name}",${c.spend},${c.impressions},${c.clicks},${ctr},${cpc},${c.orders},${cvr},${c.gmv},${roas},${c.targetRoas},"${status}"\n`;
        });
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `tiktok_shop_gmv_max_report_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('File CSV berhasil diekspor!', 'success');
    });

    // CSV Drag and Drop
    csvDropzone.addEventListener('click', () => csvFileInput.click());
    
    csvDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        csvDropzone.classList.add('dragover');
    });

    csvDropzone.addEventListener('dragleave', () => {
        csvDropzone.classList.remove('dragover');
    });

    csvDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        csvDropzone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleCsvFile(files[0]);
        }
    });

    csvFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleCsvFile(e.target.files[0]);
        }
    });

    function handleCsvFile(file) {
        const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
        const isCsv = file.name.endsWith('.csv');

        if (!isExcel && !isCsv) {
            showToast('Format file tidak didukung! Gunakan Excel (.xlsx, .xls) atau CSV.', 'error');
            return;
        }

        const reader = new FileReader();

        if (isExcel) {
            showToast('Memproses file Excel...', 'info');
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    
                    // Convert sheet to CSV format
                    const csvText = XLSX.utils.sheet_to_csv(worksheet);
                    parseAndLoadCsv(csvText);
                } catch (err) {
                    console.error(err);
                    showToast('Gagal memproses file Excel!', 'error');
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            reader.onload = function(e) {
                const text = e.target.result;
                parseAndLoadCsv(text);
            };
            reader.readAsText(file);
        }
    }

    function parseAndLoadCsv(csvText) {
        try {
            const lines = csvText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            if (lines.length < 2) {
                showToast('Format CSV tidak valid atau kosong!', 'error');
                return;
            }

            // Simple CSV parser that respects quotes
            function parseCSVLine(line) {
                const result = [];
                let current = '';
                let inQuotes = false;
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') {
                        inQuotes = !inQuotes;
                    } else if (char === ',' && !inQuotes) {
                        result.push(current.trim());
                        current = '';
                    } else {
                        current += char;
                    }
                }
                result.push(current.trim());
                return result;
            }

            // Scan first 15 lines to find the actual header row
            let headerIdx = -1;
            let rawHeaders = [];
            
            for (let i = 0; i < Math.min(lines.length, 15); i++) {
                const cols = parseCSVLine(lines[i]);
                let matchCount = 0;
                cols.forEach(col => {
                    const c = col.toLowerCase();
                    if (c.includes('camp') || c.includes('name') || c.includes('kampanye') || 
                        c.includes('spend') || c.includes('cost') || c.includes('biaya') || 
                        c.includes('click') || c.includes('klik') || c.includes('impress') ||
                        c.includes('tampil') || c.includes('penayangan')) {
                        matchCount++;
                    }
                });
                
                // If at least 3 columns match advertising metrics, this is our header!
                if (matchCount >= 3) {
                    headerIdx = i;
                    rawHeaders = cols;
                    break;
                }
            }

            // Fallback if no header row detected
            if (headerIdx === -1) {
                headerIdx = 0;
                rawHeaders = parseCSVLine(lines[0]);
            }
            
            // Map headers to target metrics
            let nameIdx = -1;
            let spendIdx = -1;
            let impIdx = -1;
            let clickIdx = -1;
            let convIdx = -1;
            let gmvIdx = -1;
            let targetIdx = -1;

            rawHeaders.forEach((h, idx) => {
                const header = h.toLowerCase().replace(/[^a-z0-9\s]/g, '');
                
                if (header.includes('name') || header.includes('kampanye') || header.includes('campaign') || header.includes('nama')) {
                    nameIdx = idx;
                } else if (header.includes('spend') || header.includes('cost') || header.includes('biaya') || header.includes('jumlah yang dibelanjakan') || header.includes('anggaran yang digunakan') || header.includes('dibelanjakan') || header.includes('jumlah harian')) {
                    spendIdx = idx;
                } else if (header.includes('impress') || header.includes('tampil') || header.includes('penayangan') || header.includes('impression') || header.includes('tayangan') || header.includes('views')) {
                    impIdx = idx;
                } else if (header.includes('click') || header.includes('klik') || header.includes('jumlah klik')) {
                    clickIdx = idx;
                } else if (header.includes('conv') || header.includes('order') || header.includes('purchase') || (header.includes('konversi') && !header.includes('nilai')) || header.includes('payment') || header.includes('penjualan unit') || header.includes('pembayaran lengkap') || header.includes('jumlah konversi') || header.includes('pesanan') || header.includes('hasil')) {
                    convIdx = idx;
                } else if (header.includes('gmv') || header.includes('rev') || header.includes('value') || header.includes('nilai penjualan') || header.includes('nilai konversi') || header.includes('omset') || header.includes('omzet') || header.includes('revenue') || header.includes('pendapatan')) {
                    gmvIdx = idx;
                } else if (header.includes('target') || header.includes('roas target') || header.includes('target roas')) {
                    targetIdx = idx;
                }
            });

            // Fallback checking in case header auto-detect failed
            if (nameIdx === -1) nameIdx = 0;
            if (spendIdx === -1) spendIdx = 1;
            if (impIdx === -1) impIdx = 2;
            if (clickIdx === -1) clickIdx = 3;
            if (convIdx === -1) convIdx = 4;
            if (gmvIdx === -1) gmvIdx = 5;
            
            let parsedCount = 0;
            const newCampaigns = [];

            for (let i = headerIdx + 1; i < lines.length; i++) {
                const cols = parseCSVLine(lines[i]);
                if (cols.length < 5) continue; // Skip incomplete lines

                const name = cols[nameIdx] || `Campaign #${i}`;
                const lowerName = name.toLowerCase().trim();
                 
                // Skip total/average/summary rows commonly found at the bottom of TikTok Ads exports
                if (lowerName === 'total' || lowerName.includes('summary') || lowerName.includes('jumlah') || lowerName.includes('rata-rata') || lowerName.includes('average') || lowerName === '') {
                    continue;
                }
                
                // Helper to extract clean numbers, compatible with Indonesian & English formats
                const parseNum = (str) => {
                    if (!str) return 0;
                    let clean = str.toString().trim();
                    
                    // Remove currency symbols and spaces
                    clean = clean.replace(/[Rp$\s]/g, '');
                    
                    if (clean.includes('.') && clean.includes(',')) {
                        const lastDot = clean.lastIndexOf('.');
                        const lastComma = clean.lastIndexOf(',');
                        if (lastDot > lastComma) {
                            // English format: 134,000,000.00 -> remove commas
                            clean = clean.replace(/,/g, '');
                        } else {
                            // Indonesian format: 134.000.000,00 -> remove dots, replace comma with dot
                            clean = clean.replace(/\./g, '').replace(/,/g, '.');
                        }
                    } else if (clean.includes('.') && !clean.includes(',')) {
                        // e.g. "134.000.000" (Indonesian thousand) or "134.50" (English decimal)
                        const parts = clean.split('.');
                        if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
                            // Thousand separator: remove all dots
                            clean = clean.replace(/\./g, '');
                        }
                    } else if (clean.includes(',') && !clean.includes('.')) {
                        // e.g. "134,000,000" (English thousand) or "134,50" (Indonesian decimal)
                        const parts = clean.split(',');
                        if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
                            // Thousand separator: remove all commas
                            clean = clean.replace(/,/g, '');
                        } else {
                            // Decimal separator: replace comma with dot
                            clean = clean.replace(/,/g, '.');
                        }
                    }
                    
                    // Remove any remaining characters except digits, minus, and dot
                    clean = clean.replace(/[^0-9.-]/g, '');
                    return parseFloat(clean) || 0;
                };

                const spend = parseNum(cols[spendIdx]);
                const impressions = parseNum(cols[impIdx]);
                const clicks = parseNum(cols[clickIdx]);
                const orders = parseNum(cols[convIdx]);
                const gmv = parseNum(cols[gmvIdx]);
                
                // TikTok Shop Max ROAS target fallback
                let targetRoas = targetIdx !== -1 ? parseNum(cols[targetIdx]) : 0;
                if (targetRoas <= 0) {
                    // Try to guess a reasonable Target ROAS based on organic performance, default 2.5
                    targetRoas = 2.5;
                }

                // Try to find a matching product by checking if product name is inside campaign name
                let productId = null;
                const matchedProd = products.find(p => name.toLowerCase().includes(p.name.toLowerCase()));
                if (matchedProd) {
                    productId = matchedProd.id;
                }

                if (spend > 0) {
                    newCampaigns.push({
                        id: 'camp_csv_' + i + '_' + Date.now(),
                        name,
                        spend,
                        impressions: impressions || clicks * 80, // Safe estimate if impressions missing
                        clicks,
                        orders,
                        gmv: gmv || orders * (gmv / (orders || 1)), // Fallback estimation
                        targetRoas,
                        productId
                    });
                    parsedCount++;
                }
            }

            if (parsedCount > 0) {
                campaigns = newCampaigns; // Overwrite previous campaigns to prevent data mixing
                saveCampaignsToStorage();
                updateAppState();
                showToast(`Berhasil mengimpor ${parsedCount} kampanye!`, 'success');
            } else {
                showToast('Gagal memproses data. Cek struktur kolom CSV!', 'error');
            }

        } catch (err) {
            console.error(err);
            showToast('Format parsing CSV salah atau corrupt!', 'error');
        }
    }

    function determineStatus(c) {
        const roas = c.spend > 0 ? c.gmv / c.spend : 0;
        
        let beRoas = c.targetRoas;
        if (c.productId) {
            const prod = products.find(p => p.id === c.productId);
            if (prod) {
                beRoas = prod.beRoas;
            }
        }
        
        // Under-delivering check: spend harian sangat seret/kecil dibanding target
        const isUnderDelivering = c.targetRoas > roas && (c.targetRoas - roas) > 1.5 && c.spend < 300000;
        
        if (isUnderDelivering) return 'Under-delivering';
        if (roas < (c.productId ? beRoas : 1.0)) return 'Critical (Rugi)';
        if (roas < beRoas) return 'Warning (Low ROAS)';
        if (roas >= beRoas * 1.2) return 'Scaling Zone';
        return 'Healthy';
    }

    function getStatusBadge(status) {
        switch (status) {
            case 'Under-delivering':
                return '<span class="badge badge-yellow"><i class="fas fa-arrow-down mr-1"></i> Delivery Slow</span>';
            case 'Critical (Rugi)':
                return '<span class="badge badge-pink"><i class="fas fa-exclamation-triangle mr-1"></i> Critical Rugi</span>';
            case 'Warning (Low ROAS)':
                return '<span class="badge badge-yellow"><i class="fas fa-info-circle mr-1"></i> Low ROAS</span>';
            case 'Scaling Zone':
                return '<span class="badge badge-green"><i class="fas fa-rocket mr-1"></i> Ready to Scale</span>';
            default:
                return '<span class="badge badge-cyan"><i class="fas fa-check mr-1"></i> Healthy</span>';
        }
    }

    // App State Sync
    function updateAppState() {
        renderTable();
        calculateDashboardMetrics();
        generateRecommendations();
        updateNotifications();
        updateProductLeaderboard();
    }

    function deleteCampaign(id) {
        campaigns = campaigns.filter(c => c.id !== id);
        saveCampaignsToStorage();
        updateAppState();
        showToast('Kampanye berhasil dihapus.', 'success');
    }

    // Render Table
    function renderTable() {
        if (campaigns.length === 0) {
            campaignsTableBody.innerHTML = `
                <tr>
                    <td colspan="13" class="text-center text-gray">Belum ada data kampanye. Silakan klik "Load Demo Data", isi formulir di atas, atau drag file CSV/Excel ke kotak unggah.</td>
                </tr>
            `;
            return;
        }

        campaignsTableBody.innerHTML = '';
        campaigns.forEach(c => {
            const tr = document.createElement('tr');
            
            const ctr = c.impressions > 0 ? (c.clicks / c.impressions * 100) : 0;
            const cvr = c.clicks > 0 ? (c.orders / c.clicks * 100) : 0;
            const cpc = c.clicks > 0 ? (c.spend / c.clicks) : 0;
            const cpa = c.orders > 0 ? (c.spend / c.orders) : 0;
            const roas = c.spend > 0 ? (c.gmv / c.spend) : 0;
            
            // Product linkage calculations
            let netProfit = c.gmv - c.spend;
            let beRoasText = '-';
            let prod = null;

            if (c.productId) {
                prod = products.find(p => p.id === c.productId);
                if (prod) {
                    netProfit = (c.orders * prod.netMargin) - c.spend;
                    beRoasText = prod.beRoas === Infinity ? 'Infinite' : prod.beRoas.toFixed(2) + 'x';
                }
            }

            const status = determineStatus(c);
            const profitColorClass = netProfit >= 0 ? 'text-green' : 'text-pink';
            
            tr.innerHTML = `
                <td style="font-weight: 600; white-space: normal; min-width: 150px;">${c.name}</td>
                <td>
                    <select class="table-product-select" data-id="${c.id}" style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 4px; color: #FFF; padding: 4px; font-family: inherit; font-size: 12px; outline: none; width: 120px;">
                        <option value="">-- Hubungkan --</option>
                        ${products.map(p => `<option value="${p.id}" ${c.productId === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
                    </select>
                </td>
                <td>${formatRupiah(c.spend)}</td>
                <td class="text-glow-cyan">${formatRupiah(c.gmv)}</td>
                <td class="${profitColorClass}" style="font-weight: bold;">${formatRupiah(netProfit)}</td>
                <td>${beRoasText !== '-' ? beRoasText : c.targetRoas.toFixed(1) + 'x'}</td>
                <td style="font-weight: bold; color: ${roas >= (prod ? prod.beRoas : c.targetRoas) ? 'var(--accent-green)' : 'var(--accent-pink)'}">${roas.toFixed(2)}x</td>
                <td>${c.orders} (${cvr.toFixed(1)}%)</td>
                <td>${ctr.toFixed(2)}%</td>
                <td>${formatRupiah(cpc)}</td>
                <td>${cpa > 0 ? formatRupiah(cpa) : '-'}</td>
                <td>${getStatusBadge(status)}</td>
                <td>
                    <button class="btn-delete-row" data-id="${c.id}"><i class="fas fa-trash-alt"></i></button>
                </td>
            `;
            
            // Delete button handler
            tr.querySelector('.btn-delete-row').addEventListener('click', () => {
                deleteCampaign(c.id);
            });

            // Inline product dropdown change handler
            tr.querySelector('.table-product-select').addEventListener('change', (e) => {
                const campId = e.target.getAttribute('data-id');
                const newProdId = e.target.value;
                const idx = campaigns.findIndex(camp => camp.id === campId);
                if (idx !== -1) {
                    campaigns[idx].productId = newProdId || null;
                    saveCampaignsToStorage();
                    updateAppState();
                }
            });

            campaignsTableBody.appendChild(tr);
        });
    }

    // Calculate Dashboard Metrics
    function calculateDashboardMetrics() {
        if (campaigns.length === 0) {
            document.getElementById('val-total-spend').textContent = 'Rp 0';
            document.getElementById('val-total-gmv').textContent = 'Rp 0';
            document.getElementById('val-total-net-profit').textContent = 'Rp 0';
            document.getElementById('val-avg-roas').textContent = '0.00x';
            document.getElementById('val-roas-status').textContent = 'Target ROAS: 0.00x (0%)';
            document.getElementById('val-total-orders').textContent = '0';
            document.getElementById('val-avg-cvr').textContent = 'CVR: 0.00%';
            
            document.getElementById('val-avg-cpc').textContent = 'Rp 0';
            document.getElementById('val-avg-cpa').textContent = 'Rp 0';
            document.getElementById('val-avg-cpm').textContent = 'Rp 0';
            document.getElementById('val-avg-ctr').textContent = '0.00%';
            document.getElementById('val-avg-aov').textContent = 'Rp 0';
            
            destroyDashboardCharts();
            return;
        }

        let totalSpend = 0;
        let totalGmv = 0;
        let totalImpressions = 0;
        let totalClicks = 0;
        let totalOrders = 0;
        let weightedTargetRoasSum = 0;
        let totalNetProfit = 0;

        campaigns.forEach(c => {
            totalSpend += c.spend;
            totalGmv += c.gmv;
            totalImpressions += c.impressions;
            totalClicks += c.clicks;
            totalOrders += c.orders;
            weightedTargetRoasSum += c.targetRoas * c.spend;
            
            // Calculate individual campaign profit
            let netProfit = c.gmv - c.spend; // fallback gross profit
            if (c.productId) {
                const prod = products.find(p => p.id === c.productId);
                if (prod) {
                    netProfit = (c.orders * prod.netMargin) - c.spend;
                }
            }
            totalNetProfit += netProfit;
        });

        const avgRoas = totalSpend > 0 ? totalGmv / totalSpend : 0;
        const avgTargetRoas = totalSpend > 0 ? weightedTargetRoasSum / totalSpend : 2.5;
        const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions * 100) : 0;
        const avgCvr = totalClicks > 0 ? (totalOrders / totalClicks * 100) : 0;
        const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
        const avgCpa = totalOrders > 0 ? totalSpend / totalOrders : 0;
        const avgCpm = totalImpressions > 0 ? (totalSpend / totalImpressions * 1000) : 0;
        const avgAov = totalOrders > 0 ? totalGmv / totalOrders : 0;

        // Update view
        document.getElementById('val-total-spend').textContent = formatRupiah(totalSpend);
        document.getElementById('val-total-gmv').textContent = formatRupiah(totalGmv);
        
        const netProfitEl = document.getElementById('val-total-net-profit');
        netProfitEl.textContent = formatRupiah(totalNetProfit);
        if (totalNetProfit >= 0) {
            netProfitEl.style.color = 'var(--accent-green)';
            netProfitEl.style.textShadow = '0 0 10px rgba(0, 255, 135, 0.5)';
        } else {
            netProfitEl.style.color = 'var(--accent-pink)';
            netProfitEl.style.textShadow = '0 0 10px rgba(255, 0, 85, 0.5)';
        }
        
        const roasEl = document.getElementById('val-avg-roas');
        roasEl.textContent = avgRoas.toFixed(2) + 'x';
        
        const targetPercent = avgTargetRoas > 0 ? Math.min(100, (avgRoas / avgTargetRoas) * 100) : 0;
        document.getElementById('val-roas-status').textContent = `Target ROAS: ${avgTargetRoas.toFixed(2)}x (${targetPercent.toFixed(0)}% tercapai)`;
        
        document.getElementById('val-total-orders').textContent = formatNumber(totalOrders);
        document.getElementById('val-avg-cvr').textContent = `CVR: ${avgCvr.toFixed(2)}%`;
        
        document.getElementById('val-avg-cpc').textContent = formatRupiah(avgCpc);
        document.getElementById('val-avg-cpa').textContent = formatRupiah(avgCpa);
        document.getElementById('val-avg-cpm').textContent = formatRupiah(avgCpm);
        document.getElementById('val-avg-ctr').textContent = avgCtr.toFixed(2) + '%';
        document.getElementById('val-avg-aov').textContent = formatRupiah(avgAov);

        // Update Charts
        updateDashboardCharts();
    }

    function destroyDashboardCharts() {
        if (charts.spendGmv) charts.spendGmv.destroy();
        if (charts.roasComp) charts.roasComp.destroy();
        if (charts.overallCostDonut) charts.overallCostDonut.destroy();
    }

    function updateDashboardCharts() {
        const ctxSpendGmv = document.getElementById('chart-spend-gmv').getContext('2d');
        const ctxRoasComp = document.getElementById('chart-roas-comparison').getContext('2d');

        const labels = campaigns.map(c => c.name);
        const spendData = campaigns.map(c => c.spend);
        const gmvData = campaigns.map(c => c.gmv);
        const roasData = campaigns.map(c => c.spend > 0 ? c.gmv / c.spend : 0);
        const targetRoasData = campaigns.map(c => c.targetRoas);

        // Calculate net profit for each campaign
        const profitData = campaigns.map(c => {
            let netProfit = c.gmv - c.spend;
            if (c.productId) {
                const prod = products.find(p => p.id === c.productId);
                if (prod) {
                    netProfit = (c.orders * prod.netMargin) - c.spend;
                }
            }
            return netProfit;
        });

        destroyDashboardCharts();

        // Chart 1: Spend vs GMV vs Net Profit
        charts.spendGmv = new Chart(ctxSpendGmv, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Laba Bersih Riil',
                        data: profitData,
                        type: 'line',
                        borderColor: '#00FF87',
                        backgroundColor: 'rgba(0, 255, 135, 0.1)',
                        borderWidth: 3,
                        pointBackgroundColor: '#00FF87',
                        pointBorderColor: '#FFFFFF',
                        pointRadius: 4,
                        fill: false,
                        order: 0
                    },
                    {
                        label: 'Spend (Biaya)',
                        data: spendData,
                        backgroundColor: 'rgba(254, 44, 85, 0.75)',
                        borderColor: '#FE2C55',
                        borderWidth: 1,
                        borderRadius: 6,
                        order: 1
                    },
                    {
                        label: 'GMV (Penjualan)',
                        data: gmvData,
                        backgroundColor: 'rgba(37, 244, 238, 0.75)',
                        borderColor: '#25F4EE',
                        borderWidth: 1,
                        borderRadius: 6,
                        order: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#90A0B7', font: { family: 'Outfit' } } }
                },
                scales: {
                    x: { ticks: { color: '#90A0B7', font: { family: 'Outfit' } }, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                    y: { 
                        ticks: { 
                            color: '#90A0B7', 
                            font: { family: 'Outfit' },
                            callback: value => 'Rp ' + (value >= 1e6 ? (value/1e6).toFixed(1) + 'jt' : (value/1e3).toFixed(0) + 'rb')
                        }, 
                        grid: { color: 'rgba(255, 255, 255, 0.05)' } 
                    }
                }
            }
        });

        // Chart 2: ROAS vs Target ROAS
        charts.roasComp = new Chart(ctxRoasComp, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'ROAS Aktual',
                        data: roasData,
                        backgroundColor: 'rgba(0, 255, 135, 0.75)',
                        borderColor: '#00FF87',
                        borderWidth: 1,
                        borderRadius: 6
                    },
                    {
                        label: 'Target ROAS',
                        data: targetRoasData,
                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                        borderWidth: 1,
                        borderRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#90A0B7', font: { family: 'Outfit' } } }
                },
                scales: {
                    x: { ticks: { color: '#90A0B7', font: { family: 'Outfit' } }, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                    y: { 
                        ticks: { 
                            color: '#90A0B7', 
                            font: { family: 'Outfit' },
                            callback: value => value.toFixed(1) + 'x'
                        }, 
                        grid: { color: 'rgba(255, 255, 255, 0.05)' } 
                    }
                }
            }
        });

        // Chart 3: Struktur Pengeluaran & Profit (Breakdown GMV)
        const canvasOverallCost = document.getElementById('chart-overall-cost-donut');
        if (canvasOverallCost) {
            const ctxOverallCostDonut = canvasOverallCost.getContext('2d');
            
            let totalGmv = 0;
            let totalSpend = 0;
            let totalHpp = 0;
            let totalAdminFees = 0;
            let totalNetProfit = 0;
            
            campaigns.forEach(c => {
                totalGmv += c.gmv;
                totalSpend += c.spend;
                
                let campaignHpp = 0;
                let campaignFees = 0;
                let campaignProfit = c.gmv - c.spend; // fallback
                
                if (c.productId) {
                    const prod = products.find(p => p.id === c.productId);
                    if (prod) {
                        campaignHpp = c.orders * prod.hpp;
                        
                        const marketplaceFee = prod.marketplaceFee !== undefined ? prod.marketplaceFee : 4.0;
                        const dynamicCommission = prod.dynamicCommission !== undefined ? prod.dynamicCommission : 2.0;
                        const affiliateFee = prod.affiliateFee !== undefined ? prod.affiliateFee : 0.0;
                        const sapFee = prod.sapFee !== undefined ? prod.sapFee : 0.0;
                        const growthXtraFee = prod.growthXtraFee !== undefined ? prod.growthXtraFee : 0.0;
                        const serviceFee = prod.serviceFee !== undefined ? prod.serviceFee : 1250;
                        const logisticCost = prod.logisticCost !== undefined ? prod.logisticCost : 3000;
                        const otherCost = prod.otherCost || 0;
                        
                        const feePct = marketplaceFee + dynamicCommission + affiliateFee + sapFee + growthXtraFee;
                        campaignFees = (c.gmv * (feePct / 100)) + (c.orders * (serviceFee + logisticCost + otherCost));
                        
                        campaignProfit = (c.orders * getProductNetMargin(prod)) - c.spend;
                    }
                }
                
                totalHpp += campaignHpp;
                totalAdminFees += campaignFees;
                totalNetProfit += campaignProfit;
            });

            // If no campaigns or GMV is 0, let's show an empty donut chart
            const rawGmv = totalGmv;
            if (totalGmv === 0) {
                totalGmv = 1;
            }

            const displayProfit = Math.max(0, totalNetProfit);
            const displaySpend = totalSpend;
            const displayHpp = totalHpp;
            const displayFees = totalAdminFees;
            
            const sumComponents = displayProfit + displaySpend + displayHpp + displayFees;
            let displayOther = 0;
            if (sumComponents < totalGmv) {
                displayOther = totalGmv - sumComponents;
            }

            const donutLabels = ['Laba Bersih Riil', 'Biaya Iklan (Spend)', 'Modal Produk (HPP)', 'Biaya Admin & Komisi Platform'];
            const donutData = [displayProfit, displaySpend, displayHpp, displayFees];
            const donutColors = ['#00FF87', '#FE2C55', '#FFaa00', '#25F4EE'];

            if (displayOther > 0) {
                donutLabels.push('Margin Kotor/Lainnya');
                donutData.push(displayOther);
                donutColors.push('#90A0B7');
            }

            charts.overallCostDonut = new Chart(ctxOverallCostDonut, {
                type: 'doughnut',
                data: {
                    labels: donutLabels,
                    datasets: [{
                        data: donutData,
                        backgroundColor: donutColors,
                        borderWidth: 1,
                        borderColor: '#1e222b'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                color: '#90A0B7',
                                font: { family: 'Outfit', size: 10 },
                                boxWidth: 12
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const val = context.raw || 0;
                                    const pct = ((val / totalGmv) * 100).toFixed(1);
                                    return `${context.label}: ${formatRupiah(val)} (${pct}%)`;
                                }
                            }
                        }
                    },
                    cutout: '65%'
                }
            });
        }
    }

    // Recommendation Engine & Diagnostic Generator
    const recListContainer = document.getElementById('recommendations-list');
    const recCountCritical = document.getElementById('rec-count-critical');
    const recCountWarning = document.getElementById('rec-count-warning');
    const recCountGood = document.getElementById('rec-count-good');
    const diagShortList = document.getElementById('diag-short-list');
    const diagCount = document.getElementById('diag-count');

    function generateRecommendations() {
        if (campaigns.length === 0) {
            recListContainer.innerHTML = `
                <div class="card text-center py-5 text-gray">
                    <i class="fas fa-lightbulb fa-3x mb-3 text-cyan"></i>
                    <h3>Belum ada rekomendasi aktif</h3>
                    <p>Silakan muat data kampanye terlebih dahulu melalui tab Dashboard atau Batch Analyzer untuk menghasilkan diagnosis detail.</p>
                </div>
            `;
            recCountCritical.textContent = '0';
            recCountWarning.textContent = '0';
            recCountGood.textContent = '0';
            diagShortList.innerHTML = `
                <li class="diag-empty">Silakan load data demo atau unggah file kampanye di Batch Analyzer untuk melihat diagnosis.</li>
            `;
            diagCount.textContent = '0 Rekomendasi';
            return;
        }

        let criticalCount = 0;
        let warningCount = 0;
        let goodCount = 0;
        
        let detailedRecsHtml = '';
        let shortRecsHtml = '';

        campaigns.forEach(c => {
            const roas = c.spend > 0 ? c.gmv / c.spend : 0;
            const ctr = c.impressions > 0 ? (c.clicks / c.impressions * 100) : 0;
            const cvr = c.clicks > 0 ? (c.orders / c.clicks * 100) : 0;
            const status = determineStatus(c);

            let recType = 'warning';
            let iconClass = 'fa-exclamation-circle text-yellow';
            let title = '';
            let explanation = '';
            let actionItems = [];

            if (status === 'Critical (Rugi)') {
                criticalCount++;
                recType = 'critical';
                iconClass = 'fa-exclamation-triangle text-pink bg-pink-alpha';
                title = 'Optimasi Darurat: ROAS Kampanye Sangat Rendah';
                explanation = `Kampanye ini tidak menguntungkan dengan ROAS aktual sebesar <strong>${roas.toFixed(2)}x</strong> yang berada jauh di bawah modal iklan Anda. Pengeluaran sebesar ${formatRupiah(c.spend)} hanya menghasilkan penjualan ${formatRupiah(c.gmv)}.`;
                
                if (cvr < 1.5) {
                    actionItems.push('<strong>Perbaiki Halaman Toko (PDP):</strong> Conversion Rate Anda sangat rendah (<strong>' + cvr.toFixed(2) + '%</strong>). Hal ini menunjukkan halaman produk TikTok Shop Anda kurang meyakinkan. Tambahkan gambar produk asli, ulasan bintang 5, dan lengkapi deskripsi.');
                    actionItems.push('<strong>Buat Voucher Toko Khusus TikTok Shop:</strong> Tambahkan promosi diskon 5-10% di TikTok Shop Seller Center khusus pembeli dari live/shopping video untuk mendongkrak konversi instan.');
                }
                if (ctr < 0.8) {
                    actionItems.push('<strong>Ganti Hook Video Kreatif:</strong> Click-Through Rate rendah (<strong>' + ctr.toFixed(2) + '%</strong>). Iklan video Anda gagal menarik perhatian dalam 3 detik pertama. Lakukan editing ulang dengan memotong hook yang membosankan dan tambahkan teks diskon di awal video.');
                }
                if (actionItems.length === 0) {
                    actionItems.push('<strong>Evaluasi Harga & Penawaran Produk:</strong> Coba bandingkan harga produk Anda dengan kompetitor di TikTok Shop. Turunkan harga atau tawarkan bundel isi lebih banyak agar lebih menarik.');
                }

                // Add to short list
                shortRecsHtml += `<li class="diag-critical"><i class="fas fa-exclamation-triangle text-pink"></i> <span><strong>${c.name}</strong>: Kritis! ROAS ${roas.toFixed(2)}x rendah. ${cvr < 1.5 ? 'Optimalkan halaman produk toko Anda.' : 'Ganti materi kreatif iklan.'}</span></li>`;

            } else if (status === 'Under-delivering') {
                warningCount++;
                recType = 'warning';
                iconClass = 'fa-arrow-down text-yellow bg-yellow-alpha';
                title = 'Delivery Tertahan: Target ROAS Set Terlalu Tinggi';
                explanation = `TikTok Ads kesulitan menyerap budget iklan harian Anda karena Target ROAS yang diset sebesar <strong>${c.targetRoas.toFixed(1)}x</strong> terlalu tinggi dibandingkan performa produk sebenarnya. Spend baru terpakai ${formatRupiah(c.spend)}.`;
                actionItems.push('<strong>Turunkan Target ROAS:</strong> Secara bertahap kurangi Target ROAS di pengaturan Ads Manager sebesar 10-15% (coba set ke <strong>' + Math.max(1, (roas + 0.2)).toFixed(1) + 'x</strong>). Ini akan membuka filter algoritma agar iklan Anda dapat menjangkau lebih banyak pembeli.');
                actionItems.push('<strong>Gunakan Broad Targeting:</strong> Hindari targeting audiens yang terlalu spesifik. Biarkan algoritma GMV Max bekerja secara luas agar sistem memiliki ruang bernapas untuk menemukan pembeli potensial.');

                shortRecsHtml += `<li class="diag-warning"><i class="fas fa-hourglass-half text-yellow"></i> <span><strong>${c.name}</strong>: Penyerapan lambat. Turunkan Target ROAS menjadi ${(roas + 0.2).toFixed(1)}x untuk scale-up.</span></li>`;

            } else if (status === 'Warning (Low ROAS)') {
                warningCount++;
                recType = 'warning';
                iconClass = 'fa-info-circle text-yellow bg-yellow-alpha';
                title = 'Peringatan: ROAS di Bawah Target Set';
                explanation = `ROAS aktual iklan Anda (<strong>${roas.toFixed(2)}x</strong>) masih berada di bawah target ROAS yang Anda inginkan (<strong>${c.targetRoas.toFixed(1)}x</strong>). Kampanye ini mungkin masih profit tipis, tetapi belum mencapai target efisiensi optimal.`;
                
                if (ctr < 1.0) {
                    actionItems.push('<strong>Optimalkan Relevansi Video dengan Target Produk:</strong> CTR (<strong>' + ctr.toFixed(2) + '%</strong>) menunjukkan kecocokan video kurang kuat. Coba buat format Spark Ads dari video organic kreator afiliasi TikTok yang terbukti populer.');
                }
                actionItems.push('<strong>Gunakan Affiliate Marketing:</strong> Buka program komisi afiliasi di TikTok Shop Partner Center agar kreator lain membuat video/live review produk ini, lalu gunakan video terlaris mereka untuk diiklankan.');

                shortRecsHtml += `<li class="diag-warning"><i class="fas fa-info-circle text-yellow"></i> <span><strong>${c.name}</strong>: ROAS ${roas.toFixed(2)}x belum mencapai target. Aktifkan afiliasi kreator.</span></li>`;

            } else if (status === 'Scaling Zone') {
                goodCount++;
                recType = 'good';
                iconClass = 'fa-rocket text-green bg-green-alpha';
                title = 'Siap Scaling: Kinerja Kampanye Luar Biasa!';
                explanation = `Performa luar biasa! ROAS aktual kampanye Anda sebesar <strong>${roas.toFixed(2)}x</strong> telah melampaui target ROAS set (<strong>${c.targetRoas.toFixed(1)}x</strong>). Kampanye ini menghasilkan profit tinggi.`;
                actionItems.push('<strong>Naikkan Budget Harian (Scale-Up):</strong> Naikkan budget harian kampanye ini sebesar 20-30% secara berkala setiap 2-3 hari. Jangan menaikkan langsung drastis agar sistem optimasi bidding tidak mereset masa pembelajaran (learning phase).');
                actionItems.push('<strong>Buat Kampanye Kloning (Vertical Scaling):</strong> Kloning kampanye ini dengan menargetkan audiens broad serupa untuk menjangkau kelompok pasar baru.');

                shortRecsHtml += `<li class="diag-good"><i class="fas fa-check-circle text-green"></i> <span><strong>${c.name}</strong>: Performa mantap! ROAS ${roas.toFixed(2)}x. Rekomendasi scale-up budget harian harian Anda sebesar 25%.</span></li>`;

            } else { // Healthy
                goodCount++;
                recType = 'good';
                iconClass = 'fa-check text-cyan bg-cyan-alpha';
                title = 'Kampanye Sehat & Stabil';
                explanation = `Kampanye berjalan sehat dengan ROAS aktual <strong>${roas.toFixed(2)}x</strong> yang memenuhi ekspektasi target Anda (<strong>${c.targetRoas.toFixed(1)}x</strong>).`;
                actionItems.push('<strong>Pertahankan & Monitor Berkala:</strong> Pantau secara rutin frekuensi penayangan (Ad Frequency). Jika frekuensi mendekati angka 3, persiapkan materi video baru untuk mengantisipasi penurunan kejenuhan audiens (ad fatigue).');

                shortRecsHtml += `<li class="diag-good"><i class="fas fa-check-circle text-green"></i> <span><strong>${c.name}</strong>: Normal & Sehat. Pantau frekuensi iklan harian secara rutin.</span></li>`;
            }

            // Create checklist item HTML
            let checklistHtml = '';
            actionItems.forEach(item => {
                checklistHtml += `<li><i class="fas fa-circle-chevron-right"></i> <div>${item}</div></li>`;
            });

            detailedRecsHtml += `
                <div class="rec-card card rec-${recType}">
                    <div class="rec-card-icon bg-${recType}-alpha">
                        <i class="fas ${iconClass}"></i>
                    </div>
                    <div class="rec-card-content">
                        <div class="rec-card-header">
                            <div class="rec-card-title-group">
                                <h4>${title}</h4>
                                <span class="rec-campaign-name">${c.name}</span>
                            </div>
                            <span class="badge badge-${recType === 'critical' ? 'pink' : recType === 'warning' ? 'yellow' : 'green'}">${status}</span>
                        </div>
                        <div class="rec-card-body">
                            <p>${explanation}</p>
                            <div class="rec-metric-pill-row">
                                <div class="rec-pill">Spend: <strong>${formatRupiah(c.spend)}</strong></div>
                                <div class="rec-pill">GMV: <strong>${formatRupiah(c.gmv)}</strong></div>
                                <div class="rec-pill">ROAS: <strong>${roas.toFixed(2)}x</strong> vs Target: <strong>${c.targetRoas.toFixed(1)}x</strong></div>
                                <div class="rec-pill">CTR: <strong>${ctr.toFixed(2)}%</strong></div>
                                <div class="rec-pill">CVR: <strong>${cvr.toFixed(2)}%</strong></div>
                            </div>
                            <div class="rec-checklist-title">Langkah Tindakan Rekomendasi:</div>
                            <ul class="rec-checklist">
                                ${checklistHtml}
                            </ul>
                        </div>
                    </div>
                </div>
            `;
        });

        // Update counts
        recCountCritical.textContent = criticalCount;
        recCountWarning.textContent = warningCount;
        recCountGood.textContent = goodCount;

        // Render lists
        recListContainer.innerHTML = detailedRecsHtml;
        diagShortList.innerHTML = shortRecsHtml;
        diagCount.textContent = `${criticalCount + warningCount} Masalah Terdeteksi`;
    }

    // Demo Data Loader
    const btnLoadDemo = document.getElementById('btn-load-demo');
    if (btnLoadDemo) {
        btnLoadDemo.addEventListener('click', () => {
        // Load demo products first
        products = [
            {
                id: 'prod_demo_1',
                name: 'Tas Selempang Canvas',
                price: 120000,
                hpp: 50000,
                marketplaceFee: 4.0,
                dynamicCommission: 2.0,
                affiliateFee: 0.0,
                sapFee: 0.0,
                growthXtraFee: 0.0,
                serviceFee: 1250,
                logisticCost: 3000,
                otherCost: 0,
                voucherType: 'none',
                voucherVal: 0,
                voucherRp: 0,
                netMargin: 60650,
                marginPct: 50.5,
                beRoas: 1.98
            },
            {
                id: 'prod_demo_2',
                name: 'Daster Satin Premium',
                price: 85000,
                hpp: 35000,
                marketplaceFee: 4.0,
                dynamicCommission: 2.0,
                affiliateFee: 0.0,
                sapFee: 0.0,
                growthXtraFee: 0.0,
                serviceFee: 1250,
                logisticCost: 3000,
                otherCost: 0,
                voucherType: 'none',
                voucherVal: 0,
                voucherRp: 0,
                netMargin: 40650,
                marginPct: 47.8,
                beRoas: 2.09
            },
            {
                id: 'prod_demo_3',
                name: 'Sepatu Sneakers Running',
                price: 250000,
                hpp: 120000,
                marketplaceFee: 4.0,
                dynamicCommission: 2.0,
                affiliateFee: 0.0,
                sapFee: 0.0,
                growthXtraFee: 0.0,
                serviceFee: 1250,
                logisticCost: 3000,
                otherCost: 0,
                voucherType: 'none',
                voucherVal: 0,
                voucherRp: 0,
                netMargin: 110750,
                marginPct: 44.3,
                beRoas: 2.26
            },
            {
                id: 'prod_demo_4',
                name: 'Hijab Instan Jersey',
                price: 110000,
                hpp: 45000,
                marketplaceFee: 4.0,
                dynamicCommission: 2.0,
                affiliateFee: 0.0,
                sapFee: 0.0,
                growthXtraFee: 0.0,
                serviceFee: 1250,
                logisticCost: 3000,
                otherCost: 0,
                voucherType: 'none',
                voucherVal: 0,
                voucherRp: 0,
                netMargin: 54150,
                marginPct: 49.2,
                beRoas: 2.03
            },
            {
                id: 'prod_demo_5',
                name: 'Gantungan Kunci Custom',
                price: 50000,
                hpp: 20000,
                marketplaceFee: 4.0,
                dynamicCommission: 2.0,
                affiliateFee: 0.0,
                sapFee: 0.0,
                growthXtraFee: 0.0,
                serviceFee: 1250,
                logisticCost: 3000,
                otherCost: 0,
                voucherType: 'none',
                voucherVal: 0,
                voucherRp: 0,
                netMargin: 23750,
                marginPct: 47.5,
                beRoas: 2.11
            }
        ];
        saveProductsToStorage();
        renderProducts();
        updateProductDropdowns();

        campaigns = [
            {
                id: 'demo_1',
                name: 'Tas Selempang Canvas (TikTok Shop)',
                productId: 'prod_demo_1',
                spend: 15000000,
                impressions: 1250000,
                clicks: 18750,
                orders: 468,
                gmv: 56160000,
                targetRoas: 2.5
            },
            {
                id: 'demo_2',
                name: 'Daster Satin Premium - Shop Video',
                productId: 'prod_demo_2',
                spend: 8500000,
                impressions: 980000,
                clicks: 17640,
                orders: 141,
                gmv: 11985000,
                targetRoas: 2.5
            },
            {
                id: 'demo_3',
                name: 'Sepatu Sneakers Running (Max ROAS)',
                productId: 'prod_demo_3',
                spend: 1800000,
                impressions: 480000,
                clicks: 2880,
                orders: 12,
                gmv: 3000000,
                targetRoas: 4.0
            },
            {
                id: 'demo_4',
                name: 'Hijab Instan Jersey (GMV Max)',
                productId: 'prod_demo_4',
                spend: 12000000,
                impressions: 1100000,
                clicks: 22000,
                orders: 176,
                gmv: 19360000,
                targetRoas: 2.5
            },
            {
                id: 'demo_5',
                name: 'Gantungan Kunci Custom (Aksesoris)',
                productId: 'prod_demo_5',
                spend: 4000000,
                impressions: 920000,
                clicks: 3680,
                orders: 110,
                gmv: 5500000,
                targetRoas: 2.0
            }
        ];

        saveCampaignsToStorage();
        updateAppState();
        showToast('Data demo & produk berhasil dimuat!', 'success');
    });
}

    // Print Report as PDF
    // Print Report as PDF
    document.getElementById('btn-print-report').addEventListener('click', () => {
        if (campaigns.length === 0) {
            showToast('Harap muat data kampanye terlebih dahulu!', 'error');
            return;
        }

        // Fill print data
        document.getElementById('print-shop-name').textContent = document.getElementById('shop-name-display').textContent;
        document.getElementById('print-report-date').textContent = 'Tanggal Cetak: ' + new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

        // Update logo
        const logoPreviewImg = document.getElementById('settings-logo-preview-img');
        const printLogoContainer = document.getElementById('print-shop-logo');
        if (logoPreviewImg && logoPreviewImg.style.display !== 'none' && logoPreviewImg.src) {
            printLogoContainer.innerHTML = `<img src="${logoPreviewImg.src}" style="width: 100%; height: 100%; object-fit: cover;">`;
        } else {
            printLogoContainer.innerHTML = `<i class="fas fa-store" style="font-size: 24px; color: #333;"></i>`;
        }

        // Executive Summary KPI values
        let totalSpend = 0;
        let totalGmv = 0;
        let totalOrders = 0;
        let weightedTargetRoasSum = 0;
        let totalNetProfit = 0;

        campaigns.forEach(c => {
            totalSpend += c.spend;
            totalGmv += c.gmv;
            totalOrders += c.orders;
            weightedTargetRoasSum += c.targetRoas * c.spend;
            
            let netProfit = c.gmv - c.spend;
            if (c.productId) {
                const prod = products.find(p => p.id === c.productId);
                if (prod) {
                    netProfit = (c.orders * prod.netMargin) - c.spend;
                }
            }
            totalNetProfit += netProfit;
        });

        const avgRoas = totalSpend > 0 ? totalGmv / totalSpend : 0;

        document.getElementById('print-total-spend').textContent = formatRupiah(totalSpend);
        document.getElementById('print-total-gmv').textContent = formatRupiah(totalGmv);
        document.getElementById('print-avg-roas').textContent = avgRoas.toFixed(2) + 'x';
        
        const printNetEl = document.getElementById('print-net-profit');
        printNetEl.textContent = formatRupiah(totalNetProfit);
        printNetEl.style.color = totalNetProfit >= 0 ? '#008744' : '#d62d20';

        // Section 1: HPP Products List
        const printProductsTableBody = document.getElementById('print-products-table-body');
        printProductsTableBody.innerHTML = '';
        if (products.length === 0) {
            printProductsTableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #666; padding: 10px;">Belum ada profil HPP produk terdaftar.</td></tr>`;
        } else {
            products.forEach(p => {
                const marketplaceFee = p.marketplaceFee !== undefined ? p.marketplaceFee : 4.0;
                const dynamicCommission = p.dynamicCommission !== undefined ? p.dynamicCommission : 2.0;
                const affiliateFee = p.affiliateFee !== undefined ? p.affiliateFee : 0.0;
                const sapFee = p.sapFee !== undefined ? p.sapFee : 0.0;
                const growthXtraFee = p.growthXtraFee !== undefined ? p.growthXtraFee : 0.0;
                const serviceFee = p.serviceFee !== undefined ? p.serviceFee : 1250;
                const logisticCost = p.logisticCost !== undefined ? p.logisticCost : 3000;
                
                const discountedPrice = p.price - (p.voucherRp || 0);
                const totalAdmin = discountedPrice * ((marketplaceFee + dynamicCommission + affiliateFee + sapFee + growthXtraFee) / 100) + serviceFee;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="padding: 6px; border-bottom: 1px solid #ddd;">${p.name}</td>
                    <td style="padding: 6px; text-align: right; border-bottom: 1px solid #ddd;">${formatRupiah(p.price)}</td>
                    <td style="padding: 6px; text-align: right; border-bottom: 1px solid #ddd;">${formatRupiah(p.hpp)}</td>
                    <td style="padding: 6px; text-align: right; border-bottom: 1px solid #ddd;">${formatRupiah(p.voucherRp || 0)}</td>
                    <td style="padding: 6px; text-align: right; border-bottom: 1px solid #ddd;">${formatRupiah(totalAdmin)}</td>
                    <td style="padding: 6px; text-align: right; border-bottom: 1px solid #ddd;">${formatRupiah(logisticCost)}</td>
                    <td style="padding: 6px; text-align: right; border-bottom: 1px solid #ddd; font-weight: bold; color: ${p.netMargin >= 0 ? '#008744' : '#d62d20'}">${formatRupiah(p.netMargin)} (${p.marginPct.toFixed(1)}%)</td>
                    <td style="padding: 6px; text-align: right; border-bottom: 1px solid #ddd; font-weight: bold;">${p.beRoas === Infinity ? 'Infinite' : p.beRoas.toFixed(2) + 'x'}</td>
                `;
                printProductsTableBody.appendChild(tr);
            });
        }

        // Section 2: Campaigns List
        const printCampaignsTableBody = document.getElementById('print-campaigns-table-body');
        printCampaignsTableBody.innerHTML = '';
        campaigns.forEach(c => {
            const roas = c.spend > 0 ? c.gmv / c.spend : 0;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding: 6px; border-bottom: 1px solid #ddd;">${c.name}</td>
                <td style="padding: 6px; text-align: right; border-bottom: 1px solid #ddd;">${formatRupiah(c.spend)}</td>
                <td style="padding: 6px; text-align: right; border-bottom: 1px solid #ddd;">${formatNumber(c.impressions)}</td>
                <td style="padding: 6px; text-align: right; border-bottom: 1px solid #ddd;">${formatNumber(c.clicks)}</td>
                <td style="padding: 6px; text-align: right; border-bottom: 1px solid #ddd;">${formatNumber(c.orders)}</td>
                <td style="padding: 6px; text-align: right; border-bottom: 1px solid #ddd;">${formatRupiah(c.gmv)}</td>
                <td style="padding: 6px; text-align: right; border-bottom: 1px solid #ddd; font-weight: bold;">${roas.toFixed(2)}x (Tar: ${c.targetRoas.toFixed(1)}x)</td>
                <td style="padding: 6px; border-bottom: 1px solid #ddd; font-weight: bold;">${determineStatus(c)}</td>
            `;
            printCampaignsTableBody.appendChild(tr);
        });

        // Section 3: Diagnostic Recommendations
        const printRecsContainer = document.getElementById('print-recommendations-container');
        printRecsContainer.innerHTML = '';
        
        const diagnosticList = document.getElementById('recommendations-list');
        const recCards = diagnosticList ? diagnosticList.querySelectorAll('.rec-card') : [];
        
        if (recCards.length === 0 || (recCards.length === 1 && recCards[0].textContent.includes('Belum ada rekomendasi'))) {
            printRecsContainer.innerHTML = `<div style="color: #666; font-style: italic; font-size: 11px;">Tidak ada rekomendasi aktif. Semua kampanye berada dalam rentang sehat.</div>`;
        } else {
            recCards.forEach(card => {
                const title = card.querySelector('.rec-card-title-group h4') ? card.querySelector('.rec-card-title-group h4').textContent : '';
                const desc = card.querySelector('.rec-card-body p') ? card.querySelector('.rec-card-body p').textContent : '';
                const tag = card.querySelector('.rec-tag') ? card.querySelector('.rec-tag').textContent : '';
                const badge = card.querySelector('.badge') ? card.querySelector('.badge').textContent : '';

                const item = document.createElement('div');
                item.style.border = '1px solid #eee';
                item.style.padding = '8px';
                item.style.borderRadius = '5px';
                item.style.fontSize = '11px';
                
                item.innerHTML = `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-weight: bold;">
                        <span style="color: #111;">[${tag}] ${title}</span>
                        <span style="color: #666; font-size: 9px; border: 1px solid #999; padding: 1px 3px; border-radius: 3px;">${badge}</span>
                    </div>
                    <div style="color: #444; font-size: 10.5px;">${desc}</div>
                `;
                printRecsContainer.appendChild(item);
            });
        }

        document.body.classList.add('print-mode-dashboard');
        document.body.classList.remove('print-mode-daily');
        showToast('Membuka dialog pencetakan laporan PDF...', 'info');
        setTimeout(() => {
            window.print();
            setTimeout(() => {
                document.body.classList.remove('print-mode-dashboard');
            }, 1000);
        }, 500);
    });

    // ==========================================
    // PRODUCT MANAGER & HPP CALCULATOR LOGIC
    // ==========================================

    const productForm = document.getElementById('product-form');
    const prodIdInput = document.getElementById('prod-id');
    const prodNameInput = document.getElementById('prod-name');
    const prodPriceInput = document.getElementById('prod-price');
    const prodHppInput = document.getElementById('prod-hpp');
    const prodMarketplaceFeeInput = document.getElementById('prod-marketplace-fee');
    const prodDynamicCommissionInput = document.getElementById('prod-dynamic-commission');
    const prodAffiliateFeeInput = document.getElementById('prod-affiliate-fee');
    const prodServiceFeeInput = document.getElementById('prod-service-fee');
    const prodLogisticCostInput = document.getElementById('prod-logistic-cost');
    const prodSapFeeInput = document.getElementById('prod-sap-fee');
    const prodGrowthXtraFeeInput = document.getElementById('prod-growth-xtra-fee');
    
    // Voucher fields
    const prodVoucherType = document.getElementById('prod-voucher-type');
    const groupProdVoucherVal = document.getElementById('group-prod-voucher-val');
    const prodVoucherVal = document.getElementById('prod-voucher-val');
    const addonVoucherUnit = document.getElementById('addon-voucher-unit');

    prodVoucherType.addEventListener('change', () => {
        const val = prodVoucherType.value;
        if (val === 'none') {
            groupProdVoucherVal.style.display = 'none';
            prodVoucherVal.value = '0';
        } else {
            groupProdVoucherVal.style.display = 'block';
            addonVoucherUnit.textContent = val === 'nominal' ? 'Rp' : '%';
        }
    });
    
    const btnCancelProduct = document.getElementById('btn-cancel-product');
    const productsTableBody = document.getElementById('products-table-body');
    
    // Product summary elements
    const prodSummaryMarginRp = document.getElementById('prod-summary-margin-rp');
    const prodSummaryBeRoas = document.getElementById('prod-summary-be-roas');
    const prodSummaryMarginPct = document.getElementById('prod-summary-margin-pct');

    // Simulator select integration
    const simSelectProduct = document.getElementById('sim-select-product');
    const addCampProduct = document.getElementById('add-camp-product');

    // Live preview update helper
    function updateLivePreview() {
        const name = prodNameInput.value.trim() || 'Produk Baru';
        const price = parseFloat(prodPriceInput.value) || 0;
        const hpp = parseFloat(prodHppInput.value) || 0;
        const marketplaceFee = parseFloat(prodMarketplaceFeeInput.value) || 0;
        const dynamicCommission = parseFloat(prodDynamicCommissionInput.value) || 0;
        const affiliateFee = parseFloat(prodAffiliateFeeInput.value) || 0;
        const sapFee = parseFloat(prodSapFeeInput.value) || 0;
        const growthXtraFee = parseFloat(prodGrowthXtraFeeInput.value) || 0;
        const serviceFee = parseFloat(prodServiceFeeInput.value) || 0;
        const logisticCost = parseFloat(prodLogisticCostInput.value) || 0;
        
        const voucherType = prodVoucherType.value;
        const voucherVal = parseFloat(prodVoucherVal.value) || 0;

        let voucherRp = 0;
        if (voucherType === 'nominal') {
            voucherRp = voucherVal;
        } else if (voucherType === 'percent') {
            voucherRp = price * (voucherVal / 100);
        }

        const discountedPrice = price - voucherRp;
        const marketRp = discountedPrice * (marketplaceFee / 100);
        const dynamicRp = discountedPrice * (dynamicCommission / 100);
        const affRp = discountedPrice * (affiliateFee / 100);
        const sapRp = discountedPrice * (sapFee / 100);
        const growthXtraRp = discountedPrice * (growthXtraFee / 100);
        
        const netMargin = discountedPrice - hpp - marketRp - dynamicRp - affRp - sapRp - growthXtraRp - serviceFee - logisticCost;
        const marginPct = price > 0 ? (netMargin / price) * 100 : 0;
        const beRoas = netMargin > 0 ? (price / netMargin) : Infinity;

        const tempProduct = {
            name,
            price,
            hpp,
            marketplaceFee,
            dynamicCommission,
            affiliateFee,
            sapFee,
            growthXtraFee,
            serviceFee,
            logisticCost,
            voucherType,
            voucherVal,
            voucherRp,
            netMargin,
            marginPct,
            beRoas
        };

        showProductBreakdown(tempProduct);
    }

    // Attach event listeners for real-time live preview
    [
        prodNameInput, prodPriceInput, prodHppInput,
        prodMarketplaceFeeInput, prodDynamicCommissionInput, prodAffiliateFeeInput,
        prodSapFeeInput, prodGrowthXtraFeeInput,
        prodServiceFeeInput, prodLogisticCostInput, prodVoucherVal
    ].forEach(input => {
        if (input) input.addEventListener('input', updateLivePreview);
    });

    prodVoucherType.addEventListener('change', updateLivePreview);

    // Handle form submit (save or update product)
    productForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const id = prodIdInput.value;
        const name = prodNameInput.value.trim();
        const price = parseFloat(prodPriceInput.value) || 0;
        const hpp = parseFloat(prodHppInput.value) || 0;
        const marketplaceFee = parseFloat(prodMarketplaceFeeInput.value) || 0;
        const dynamicCommission = parseFloat(prodDynamicCommissionInput.value) || 0;
        const affiliateFee = parseFloat(prodAffiliateFeeInput.value) || 0;
        const sapFee = parseFloat(prodSapFeeInput.value) || 0;
        const growthXtraFee = parseFloat(prodGrowthXtraFeeInput.value) || 0;
        const serviceFee = parseFloat(prodServiceFeeInput.value) || 0;
        const logisticCost = parseFloat(prodLogisticCostInput.value) || 0;
        const otherCost = 0; // Kemasan tidak ada
        
        const voucherType = prodVoucherType.value;
        const voucherVal = parseFloat(prodVoucherVal.value) || 0;

        // Calculate voucher discount in Rupiah
        let voucherRp = 0;
        if (voucherType === 'nominal') {
            voucherRp = voucherVal;
        } else if (voucherType === 'percent') {
            voucherRp = price * (voucherVal / 100);
        }

        const discountedPrice = price - voucherRp;

        const marketplaceRp = discountedPrice * (marketplaceFee / 100);
        const dynamicCommRp = discountedPrice * (dynamicCommission / 100);
        const affiliateRp = discountedPrice * (affiliateFee / 100);
        const sapRp = discountedPrice * (sapFee / 100);
        const growthXtraRp = discountedPrice * (growthXtraFee / 100);
        const netMargin = discountedPrice - hpp - marketplaceRp - dynamicCommRp - affiliateRp - sapRp - growthXtraRp - serviceFee - logisticCost;
        const marginPct = price > 0 ? (netMargin / price) * 100 : 0;
        const beRoas = netMargin > 0 ? (price / netMargin) : Infinity;

        if (netMargin <= 0) {
            showToast('Hati-hati! Margin bersih Anda minus atau nol dengan biaya ini.', 'error');
        }

        const productData = { 
            id: id || 'prod_' + Date.now(), 
            name, 
            price, 
            hpp, 
            marketplaceFee,
            dynamicCommission,
            affiliateFee, 
            sapFee,
            growthXtraFee,
            serviceFee, 
            logisticCost, 
            otherCost, 
            voucherType,
            voucherVal,
            voucherRp,
            netMargin, 
            marginPct, 
            beRoas 
        };

        if (id) {
            // Edit Mode (Update existing product)
            const index = products.findIndex(p => p.id === id);
            if (index !== -1) {
                products[index] = productData;
                showToast('Produk berhasil diperbarui!', 'success');
            }
        } else {
            // Add Mode (Save new product)
            products.push(productData);
            showToast('Produk berhasil disimpan!', 'success');
        }

        // Reset Form to blank state
        resetProductForm();
        
        // Save to Storage & Update UI
        saveProductsToStorage();
        renderProducts();
        updateProductDropdowns();
        updateAppState(); // Sync batch analyzer and recommendations
    });

    function resetProductForm() {
        prodIdInput.value = '';
        productForm.reset();
        prodMarketplaceFeeInput.value = "4.0";
        prodDynamicCommissionInput.value = "2.0";
        prodAffiliateFeeInput.value = "0.0";
        prodSapFeeInput.value = "0.0";
        prodGrowthXtraFeeInput.value = "0.0";
        prodServiceFeeInput.value = "1250";
        prodLogisticCostInput.value = "3000";
        prodVoucherType.value = "none";
        prodVoucherVal.value = "0";
        groupProdVoucherVal.style.display = 'none';
        if (btnCancelProduct) btnCancelProduct.style.display = 'none';
        document.getElementById('btn-save-product').innerHTML = '<i class="fas fa-save"></i> Simpan Produk';
    }

    if (btnCancelProduct) {
        btnCancelProduct.addEventListener('click', resetProductForm);
    }

    function saveProductsToStorage() {
        localStorage.setItem('tiktok_products', JSON.stringify(products));
    }

    function saveCampaignsToStorage() {
        localStorage.setItem('tiktok_campaigns', JSON.stringify(campaigns));
    }

    function showProductBreakdown(p) {
        const bdCard = document.getElementById('product-detail-breakdown');
        const summaryTitle = document.getElementById('prod-summary-title');
        
        if (!p) {
            prodSummaryMarginRp.textContent = 'Rp 0';
            prodSummaryBeRoas.textContent = '0.00x';
            prodSummaryMarginPct.textContent = '0%';
            bdCard.style.display = 'none';
            if (charts.productCost) {
                charts.productCost.destroy();
                charts.productCost = null;
            }
            if (summaryTitle) {
                summaryTitle.innerHTML = `<i class="fas fa-info-circle"></i> Menampilkan Detail Profil: (Belum ada produk)`;
            }
            return;
        }

        if (summaryTitle) {
            summaryTitle.innerHTML = `<i class="fas fa-info-circle"></i> Menampilkan Detail Profil: <strong style="color: #FFF; background: rgba(0,255,255,0.05); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(0,255,255,0.1); font-size: 13.5px; text-transform: none; letter-spacing: 0;">${p.name}</strong>`;
        }

        prodSummaryMarginRp.textContent = formatRupiah(p.netMargin);
        prodSummaryBeRoas.textContent = p.beRoas === Infinity ? 'Infinite' : p.beRoas.toFixed(2) + 'x';
        prodSummaryMarginPct.textContent = p.marginPct.toFixed(1) + '%';
        
        bdCard.style.display = 'block';
        
        const marketplaceFee = p.marketplaceFee !== undefined ? p.marketplaceFee : 4.0;
        const dynamicCommission = p.dynamicCommission !== undefined ? p.dynamicCommission : 2.0;
        const affiliateFee = p.affiliateFee !== undefined ? p.affiliateFee : 0.0;
        const sapFee = p.sapFee !== undefined ? p.sapFee : 0.0;
        const growthXtraFee = p.growthXtraFee !== undefined ? p.growthXtraFee : 0.0;
        const serviceFee = p.serviceFee !== undefined ? p.serviceFee : 1250;
        const logisticCost = p.logisticCost !== undefined ? p.logisticCost : 3000;
        const voucherRp = p.voucherRp || 0;
        const discountedPrice = p.price - voucherRp;

        const marketRp = discountedPrice * (marketplaceFee / 100);
        const dynamicRp = discountedPrice * (dynamicCommission / 100);
        const affRp = discountedPrice * (affiliateFee / 100);
        const sapRp = discountedPrice * (sapFee / 100);
        const growthXtraRp = discountedPrice * (growthXtraFee / 100);
        const totalFees = marketRp + dynamicRp + affRp + sapRp + growthXtraRp + serviceFee;

        document.getElementById('bd-price').textContent = formatRupiah(p.price);
        document.getElementById('bd-voucher').textContent = (voucherRp > 0 ? `- ` : '') + formatRupiah(voucherRp) + (p.voucherType === 'percent' ? ` (${p.voucherVal}%)` : '');
        document.getElementById('bd-net-price').textContent = formatRupiah(discountedPrice);
        document.getElementById('bd-hpp').textContent = `- ${formatRupiah(p.hpp)}`;
        document.getElementById('bd-marketplace').textContent = `- ${formatRupiah(marketRp)} (${marketplaceFee}%)`;
        document.getElementById('bd-dynamic').textContent = `- ${formatRupiah(dynamicRp)} (${dynamicCommission}%)`;
        document.getElementById('bd-affiliate').textContent = `- ${formatRupiah(affRp)} (${affiliateFee}%)`;
        document.getElementById('bd-sap').textContent = `- ${formatRupiah(sapRp)} (${sapFee}%)`;
        document.getElementById('bd-growth-xtra').textContent = `- ${formatRupiah(growthXtraRp)} (${growthXtraFee}%)`;
        document.getElementById('bd-service').textContent = `- ${formatRupiah(serviceFee)}`;
        document.getElementById('bd-logistic').textContent = `- ${formatRupiah(logisticCost)}`;
        
        const marginEl = document.getElementById('bd-margin');
        marginEl.textContent = `${formatRupiah(p.netMargin)} (${p.marginPct.toFixed(1)}%)`;
        if (p.netMargin > 0) {
            marginEl.style.color = 'var(--accent-green)';
        } else {
            marginEl.style.color = 'var(--accent-pink)';
        }

        // Calculate Break-Even CPC based on netMargin and adjustable CVR
        const cvrInput = document.getElementById('bd-cvr-estimate');
        const cpcOutput = document.getElementById('bd-be-cpc');
        
        function updateBeCpc() {
            if (cvrInput && cpcOutput) {
                const cvr = parseFloat(cvrInput.value) || 2.0;
                const beCpc = p.netMargin * (cvr / 100);
                cpcOutput.textContent = formatRupiah(Math.max(0, beCpc));
            }
        }
        
        if (cvrInput) {
            cvrInput.replaceWith(cvrInput.cloneNode(true));
        }
        
        const newCvrInput = document.getElementById('bd-cvr-estimate');
        if (newCvrInput) {
            newCvrInput.addEventListener('input', updateBeCpc);
            updateBeCpc();
        }

        // Draw visual cost breakdown chart
        drawProductCostChart(p.hpp, totalFees, logisticCost, voucherRp, p.netMargin);
    }

    function drawProductCostChart(hpp, fees, logistic, voucher, margin) {
        const canvas = document.getElementById('chart-product-cost-donut');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (charts.productCost) {
            charts.productCost.destroy();
        }

        const displayMargin = Math.max(0, margin);

        charts.productCost = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['HPP', 'Biaya Admin TikTok', 'Biaya Ongkir', 'Voucher Toko', 'Margin Bersih'],
                datasets: [{
                    data: [hpp, fees, logistic, voucher, displayMargin],
                    backgroundColor: [
                        '#FE2C55', // HPP - Pink
                        '#B259FF', // Fees - Purple
                        '#FFD214', // Logistic - Yellow
                        'rgba(254, 44, 85, 0.4)', // Voucher - Light Pink
                        '#00FF87'  // Margin - Green
                    ],
                    borderColor: '#11141E',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const val = context.raw;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = total > 0 ? (val / total * 100).toFixed(1) : 0;
                                return ` ${context.label}: ${formatRupiah(val)} (${pct}%)`;
                            }
                        }
                    }
                },
            }
        });
    }

    function renderProducts() {
        if (products.length === 0) {
            productsTableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center text-gray">Belum ada produk. Masukkan detail produk di sebelah kiri untuk membuat profil HPP.</td>
                </tr>
            `;
            showProductBreakdown(null);
            return;
        }

        productsTableBody.innerHTML = '';
        
        products.forEach(p => {
            const tr = document.createElement('tr');
            
            const marketplaceFee = p.marketplaceFee !== undefined ? p.marketplaceFee : 4.0;
            const dynamicCommission = p.dynamicCommission !== undefined ? p.dynamicCommission : 2.0;
            const affiliateFee = p.affiliateFee !== undefined ? p.affiliateFee : 0.0;
            const sapFee = p.sapFee !== undefined ? p.sapFee : 0.0;
            const growthXtraFee = p.growthXtraFee !== undefined ? p.growthXtraFee : 0.0;
            const serviceFee = p.serviceFee !== undefined ? p.serviceFee : 1250;
            const logisticCost = p.logisticCost !== undefined ? p.logisticCost : 3000;
            const voucherType = p.voucherType || 'none';
            const voucherVal = p.voucherVal || 0;
            const voucherRp = p.voucherRp || 0;

            const discountedPrice = p.price - voucherRp;
            const marketRp = discountedPrice * (marketplaceFee / 100);
            const dynamicRp = discountedPrice * (dynamicCommission / 100);
            const affRp = discountedPrice * (affiliateFee / 100);
            const sapRp = discountedPrice * (sapFee / 100);
            const growthXtraRp = discountedPrice * (growthXtraFee / 100);
            const totalFeesRp = marketRp + dynamicRp + affRp + sapRp + growthXtraRp + serviceFee;
            const totalPercent = marketplaceFee + dynamicCommission + affiliateFee + sapFee + growthXtraFee;
            
            let voucherText = '-';
            if (voucherType === 'nominal') {
                voucherText = formatRupiah(voucherRp);
            } else if (voucherType === 'percent') {
                voucherText = `${voucherVal}% (${formatRupiah(voucherRp)})`;
            }

            tr.innerHTML = `
                <td style="font-weight: 600;">${p.name}</td>
                <td>${formatRupiah(p.price)}</td>
                <td>${formatRupiah(p.hpp)}</td>
                <td>${voucherText}</td>
                <td>${formatRupiah(totalFeesRp)} <span style="font-size: 11px; color: var(--text-muted);">(${totalPercent.toFixed(1)}%)</span></td>
                <td>${formatRupiah(logisticCost)}</td>
                <td style="font-weight: bold; color: ${p.netMargin > 0 ? 'var(--accent-cyan)' : 'var(--accent-pink)'}">
                    ${formatRupiah(p.netMargin)} (${p.marginPct.toFixed(1)}%)
                </td>
                <td style="font-weight: bold; color: var(--accent-pink)">${p.beRoas === Infinity ? 'Infinite' : p.beRoas.toFixed(2) + 'x'}</td>
                <td>
                    <button class="btn-delete-prod" data-id="${p.id}" style="background: rgba(255, 0, 85, 0.1); border: 1px solid var(--accent-pink); color: var(--accent-pink) !important; padding: 4px 8px; border-radius: 4px; font-family: inherit; font-size: 11px; cursor: pointer; outline: none; transition: var(--transition-fast);"><i class="fas fa-trash-alt"></i> Hapus</button>
                </td>
            `;

            tr.style.cursor = 'pointer';
            tr.title = "Klik baris ini untuk memuat ke form & melihat rincian biaya";
            
            // Add click listener to the entire row (except delete clicks)
            tr.addEventListener('click', (e) => {
                if (e.target.closest('.btn-delete-prod')) {
                    return; // Let delete handler handle it
                }
                
                // Copy/populate values into the form so the user can adjust prices
                prodIdInput.value = p.id;
                prodNameInput.value = p.name;
                prodPriceInput.value = p.price;
                prodHppInput.value = p.hpp;
                prodMarketplaceFeeInput.value = marketplaceFee;
                prodDynamicCommissionInput.value = dynamicCommission;
                prodAffiliateFeeInput.value = affiliateFee;
                prodSapFeeInput.value = sapFee;
                prodGrowthXtraFeeInput.value = growthXtraFee;
                prodServiceFeeInput.value = serviceFee;
                prodLogisticCostInput.value = logisticCost;
                prodVoucherType.value = voucherType;
                prodVoucherVal.value = voucherVal;
                
                if (voucherType === 'none') {
                    groupProdVoucherVal.style.display = 'none';
                } else {
                    groupProdVoucherVal.style.display = 'block';
                    addonVoucherUnit.textContent = voucherType === 'nominal' ? 'Rp' : '%';
                }

                // Show cancel button and change submit text to update
                if (btnCancelProduct) btnCancelProduct.style.display = 'block';
                document.getElementById('btn-save-product').innerHTML = '<i class="fas fa-save"></i> Perbarui Produk';
                
                // Highlight selected row visually
                document.querySelectorAll('#products-table-body tr').forEach(r => r.classList.remove('active-row-highlight'));
                tr.classList.add('active-row-highlight');
                
                // Show breakdown for this product
                showProductBreakdown(p);
            });

            // Delete handler
            tr.querySelector('.btn-delete-prod').addEventListener('click', () => {
                if (confirm(`Apakah Anda yakin ingin menghapus produk "${p.name}"?`)) {
                    products = products.filter(x => x.id !== p.id);
                    saveProductsToStorage();
                    renderProducts();
                    updateProductDropdowns();
                    updateAppState();
                    showToast('Produk berhasil dihapus.', 'success');
                }
            });

            productsTableBody.appendChild(tr);
        });

        // Show summary of last product by default
        showProductBreakdown(products[products.length - 1]);
        updateProductLeaderboard();
    }

    function updateProductLeaderboard() {
        try {
            const tableBody = document.getElementById('leaderboard-table-body');
            if (!tableBody) return;

            if (!Array.isArray(products) || products.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center text-gray" style="padding: 15px;">Belum ada data produk terdaftar.</td>
                    </tr>
                `;
                return;
            }

            const leaderboardData = products.map(prod => {
                let totalProfitContribution = 0;

                if (Array.isArray(campaigns)) {
                    campaigns.forEach(c => {
                        if (c.productId === prod.id) {
                            const profit = (c.orders * getProductNetMargin(prod)) - c.spend;
                            totalProfitContribution += profit;
                        }
                    });
                }

                if (Array.isArray(dailyLogs)) {
                    dailyLogs.forEach(log => {
                        if (log.productId === prod.id) {
                            const profit = (log.orders * getProductNetMargin(prod)) - log.spend;
                            totalProfitContribution += profit;
                        }
                    });
                }

                return {
                    product: prod,
                    netMargin: getProductNetMargin(prod),
                    beRoas: prod.beRoas,
                    totalProfit: totalProfitContribution
                };
            });

            leaderboardData.sort((a, b) => {
                if (b.totalProfit !== a.totalProfit) {
                    return b.totalProfit - a.totalProfit;
                }
                return b.netMargin - a.netMargin;
            });

            tableBody.innerHTML = '';

            leaderboardData.forEach((item, index) => {
                const tr = document.createElement('tr');
                const rank = index + 1;
                const p = item.product;
                
                let recBadge = '<span class="badge badge-cyan">Netral</span>';
                if (item.totalProfit > 5000000) {
                    recBadge = '<span class="badge badge-green" style="background: rgba(0, 255, 135, 0.15); color: var(--accent-green); border: 1px solid var(--accent-green);">🔥 Top Winner (Scale Up!)</span>';
                } else if (item.totalProfit > 0 && item.beRoas < 2.0) {
                    recBadge = '<span class="badge badge-cyan" style="background: rgba(37, 244, 238, 0.15); color: var(--accent-cyan); border: 1px solid var(--accent-cyan);">🚀 Sangat Potensial</span>';
                } else if (item.totalProfit < 0) {
                    recBadge = '<span class="badge badge-pink" style="background: rgba(254, 44, 85, 0.15); color: var(--accent-pink); border: 1px solid var(--accent-pink);">⚠️ Perlu Efisiensi</span>';
                } else if (item.netMargin < 15000) {
                    recBadge = '<span class="badge badge-warning" style="background: rgba(255, 170, 0, 0.15); color: #FFAA00; border: 1px solid #FFAA00;">💸 Margin Tipis</span>';
                }

                const profitColor = item.totalProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-pink)';

                tr.innerHTML = `
                    <td><strong>#${rank}</strong></td>
                    <td><strong>${p.name}</strong></td>
                    <td style="text-align: right; font-weight: 600;">${formatRupiah(item.netMargin)} (${p.marginPct.toFixed(1)}%)</td>
                    <td style="text-align: right; font-weight: 600;">${item.beRoas === Infinity ? 'Infinite' : item.beRoas.toFixed(2) + 'x'}</td>
                    <td style="text-align: right; font-weight: bold; color: ${profitColor};">${formatRupiah(item.totalProfit)}</td>
                    <td>${recBadge}</td>
                `;
                tableBody.appendChild(tr);
            });
        } catch (err) {
            console.error('Error updating product leaderboard:', err);
        }
    }

    // ==========================================
    // MASS PRICING SIMULATOR LOGIC
    // ==========================================
    const massPricePctInput = document.getElementById('mass-adj-price-pct');
    const massHppPctInput = document.getElementById('mass-adj-hpp-pct');
    const btnMassPreview = document.getElementById('btn-mass-preview');
    const btnMassApply = document.getElementById('btn-mass-apply');
    const massPreviewContainer = document.getElementById('mass-preview-table-container');
    const massPreviewTableBody = document.getElementById('mass-preview-table-body');

    let simulatedProducts = [];

    if (btnMassPreview) {
        btnMassPreview.addEventListener('click', () => {
            if (products.length === 0) {
                showToast('Belum ada produk untuk disimulasikan. Silakan tambahkan produk terlebih dahulu.', 'error');
                return;
            }

            const pricePct = parseFloat(massPricePctInput.value) || 0;
            const hppPct = parseFloat(massHppPctInput.value) || 0;

            if (pricePct === 0 && hppPct === 0) {
                showToast('Masukkan persentase perubahan harga atau HPP terlebih dahulu.', 'info');
                return;
            }

            simulatedProducts = products.map(p => {
                const newPrice = Math.round(p.price * (1 + pricePct / 100));
                const newHpp = Math.round(p.hpp * (1 + hppPct / 100));
                
                const marketplaceFee = p.marketplaceFee !== undefined ? p.marketplaceFee : 4.0;
                const dynamicCommission = p.dynamicCommission !== undefined ? p.dynamicCommission : 2.0;
                const affiliateFee = p.affiliateFee !== undefined ? p.affiliateFee : 0.0;
                const sapFee = p.sapFee !== undefined ? p.sapFee : 0.0;
                const growthXtraFee = p.growthXtraFee !== undefined ? p.growthXtraFee : 0.0;
                const serviceFee = p.serviceFee !== undefined ? p.serviceFee : 1250;
                const logisticCost = p.logisticCost !== undefined ? p.logisticCost : 3000;
                
                const voucherRp = p.voucherRp || 0;
                const discountedPrice = newPrice - voucherRp;

                const marketRp = discountedPrice * (marketplaceFee / 100);
                const dynamicRp = discountedPrice * (dynamicCommission / 100);
                const affRp = discountedPrice * (affiliateFee / 100);
                const sapRp = discountedPrice * (sapFee / 100);
                const growthXtraRp = discountedPrice * (growthXtraFee / 100);

                const newNetMargin = discountedPrice - newHpp - marketRp - dynamicRp - affRp - sapRp - growthXtraRp - serviceFee - logisticCost;
                const newMarginPct = newPrice > 0 ? (newNetMargin / newPrice) * 100 : 0;
                const newBeRoas = newNetMargin > 0 ? (newPrice / newNetMargin) : Infinity;

                return {
                    ...p,
                    price: newPrice,
                    hpp: newHpp,
                    netMargin: newNetMargin,
                    marginPct: newMarginPct,
                    beRoas: newBeRoas
                };
            });

            // Render Preview Table
            massPreviewTableBody.innerHTML = '';
            simulatedProducts.forEach(sp => {
                const oldProd = products.find(p => p.id === sp.id);
                const priceDiff = sp.price - oldProd.price;
                const hppDiff = sp.hpp - oldProd.hpp;
                const marginDiff = sp.netMargin - oldProd.netMargin;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-weight: 600;">${sp.name}</td>
                    <td>
                        ${formatRupiah(sp.price)}
                        <span style="font-size: 11px; font-weight: normal; margin-left: 5px; color: ${priceDiff >= 0 ? 'var(--accent-green)' : 'var(--accent-pink)'}">
                            (${priceDiff >= 0 ? '+' : ''}${formatRupiah(priceDiff)})
                        </span>
                    </td>
                    <td>
                        ${formatRupiah(sp.hpp)}
                        <span style="font-size: 11px; font-weight: normal; margin-left: 5px; color: ${hppDiff >= 0 ? 'var(--accent-pink)' : 'var(--accent-green)'}">
                            (${hppDiff >= 0 ? '+' : ''}${formatRupiah(hppDiff)})
                        </span>
                    </td>
                    <td style="font-weight: 500; color: ${sp.netMargin > 0 ? 'var(--accent-cyan)' : 'var(--accent-pink)'}">
                        ${formatRupiah(sp.netMargin)}
                        <span style="font-size: 11px; font-weight: normal; margin-left: 5px; color: ${marginDiff >= 0 ? 'var(--accent-green)' : 'var(--accent-pink)'}">
                            (${marginDiff >= 0 ? '+' : ''}${formatRupiah(marginDiff)})
                        </span>
                    </td>
                    <td style="font-weight: bold; color: ${sp.marginPct > 0 ? 'var(--accent-cyan)' : 'var(--accent-pink)'}">
                        ${sp.marginPct.toFixed(1)}%
                    </td>
                    <td style="font-weight: bold; color: var(--accent-pink)">
                        ${sp.beRoas === Infinity ? 'Infinite' : sp.beRoas.toFixed(2) + 'x'}
                    </td>
                `;
                massPreviewTableBody.appendChild(tr);
            });

            massPreviewContainer.style.display = 'block';
            btnMassApply.style.display = 'inline-block';
            showToast('Simulasi penyesuaian harga massal berhasil dimuat!', 'success');
        });
    }

    if (btnMassApply) {
        btnMassApply.addEventListener('click', () => {
            if (simulatedProducts.length === 0) return;

            if (confirm('Apakah Anda yakin ingin menerapkan perubahan harga & HPP baru ini ke toko Anda? Tindakan ini akan memperbarui data semua produk Anda.')) {
                products = [...simulatedProducts];
                saveProductsToStorage();
                renderProducts();
                updateProductDropdowns();
                updateAppState();

                // Reset simulator inputs
                massPricePctInput.value = '0';
                massHppPctInput.value = '0';
                massPreviewContainer.style.display = 'none';
                btnMassApply.style.display = 'none';
                
                showToast('Perubahan harga massal berhasil diterapkan!', 'success');
            }
        });
    }

    function updateProductDropdowns() {
        // Keep default options
        simSelectProduct.innerHTML = '<option value="">-- Pilih Profil (Input Manual) --</option>';
        addCampProduct.innerHTML = '<option value="">-- Tanpa HPP (Kalkulasi Standar) --</option>';

        products.forEach(p => {
            const opt1 = document.createElement('option');
            opt1.value = p.id;
            opt1.textContent = `${p.name} (Sell: ${formatNumber(p.price)} | BE ROAS: ${p.beRoas.toFixed(2)}x)`;
            simSelectProduct.appendChild(opt1);

            const opt2 = document.createElement('option');
            opt2.value = p.id;
            opt2.textContent = p.name;
            addCampProduct.appendChild(opt2);
        });

        updateDailyProductDropdown();
    }

    // Integrate with Simulator selection change
    simSelectProduct.addEventListener('change', () => {
        const selectedId = simSelectProduct.value;
        if (selectedId) {
            const p = products.find(prod => prod.id === selectedId);
            if (p) {
                // Auto-fill simulator inputs
                simInputs.aov.value = p.price;
                simInputs.hpp.value = p.hpp;
                
                // Set read-only to emphasize integration
                simInputs.aov.readOnly = true;
                simInputs.hpp.readOnly = true;
                simInputs.aov.style.opacity = '0.7';
                simInputs.hpp.style.opacity = '0.7';
                
                showToast(`Profil produk "${p.name}" dimuat ke simulator.`, 'info');
            }
        } else {
            // Re-enable manual inputs
            simInputs.aov.readOnly = false;
            simInputs.hpp.readOnly = false;
            simInputs.aov.style.opacity = '1';
            simInputs.hpp.style.opacity = '1';
        }
        saveSimulatorInputsToStorage();
        updateSimulator();
    });

    // ==========================================
    // BACKUP & RESTORE HPP DATA LOGIC
    // ==========================================
    const btnBackupHpp = document.getElementById('btn-backup-hpp');
    const inputRestoreHppFile = document.getElementById('input-restore-hpp-file');

    if (btnBackupHpp) {
        btnBackupHpp.addEventListener('click', () => {
            if (products.length === 0) {
                showToast('Belum ada data produk HPP untuk dibackup.', 'error');
                return;
            }

            try {
                const jsonStr = JSON.stringify(products, null, 2);
                const blob = new Blob([jsonStr], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const downloadAnchorNode = document.createElement('a');
                downloadAnchorNode.setAttribute("href", url);
                downloadAnchorNode.setAttribute("download", `tiktok_hpp_products_backup_${Date.now()}.json`);
                document.body.appendChild(downloadAnchorNode);
                downloadAnchorNode.click();
                downloadAnchorNode.remove();
                URL.revokeObjectURL(url); // Clean up memory
                showToast('Backup data HPP berhasil diunduh!', 'success');
            } catch (err) {
                console.error(err);
                showToast('Gagal mencadangkan data HPP.', 'error');
            }
        });
    }

    if (inputRestoreHppFile) {
        inputRestoreHppFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (!file.name.endsWith('.json')) {
                showToast('Format file backup harus JSON (.json)!', 'error');
                return;
            }

            const reader = new FileReader();
            reader.onload = function(evt) {
                try {
                    const imported = JSON.parse(evt.target.result);
                    if (Array.isArray(imported)) {
                        const isValid = imported.every(p => p.hasOwnProperty('id') && p.hasOwnProperty('name') && p.hasOwnProperty('price') && p.hasOwnProperty('hpp'));
                        if (!isValid) {
                            showToast('Format data backup HPP tidak valid!', 'error');
                            return;
                        }

                        if (confirm(`Apakah Anda yakin ingin memulihkan ${imported.length} produk HPP? Ini akan menimpa data produk Anda saat ini.`)) {
                            products = imported;
                            saveProductsToStorage();
                            renderProducts();
                            updateProductDropdowns();
                            updateAppState();
                            showToast(`Berhasil memulihkan ${imported.length} data produk HPP!`, 'success');
                        }
                    } else {
                        showToast('Data backup HPP harus berupa array JSON!', 'error');
                    }
                } catch (err) {
                    console.error(err);
                    showToast('Gagal memproses file JSON backup!', 'error');
                }
                inputRestoreHppFile.value = '';
            };
            reader.readAsText(file);
        });
    }

    // Initialize Products view
    renderProducts();
    updateProductDropdowns();
    updateAppState(); // Render stored campaigns and metrics on load!

    // Initialize Simulator default view
    loadSimulatorInputsFromStorage();
    updateSimulator();

    // ==========================================
    // SHOP PROFILE CUSTOMIZATION LOGIC
    // ==========================================
    const shopBadgeContainer = document.getElementById('shop-badge-container');
    const shopSettingsModal = document.getElementById('shop-settings-modal');
    const settingsShopNameInput = document.getElementById('settings-shop-name');
    const settingsShopLogoFileInput = document.getElementById('settings-shop-logo-file');
    const btnUploadLogoTrigger = document.getElementById('btn-upload-logo-trigger');
    const settingsLogoPreviewIcon = document.getElementById('settings-logo-preview-icon');
    const settingsLogoPreviewImg = document.getElementById('settings-logo-preview-img');
    const btnCloseShopSettings = document.getElementById('btn-close-shop-settings');
    const btnSaveShopSettings = document.getElementById('btn-save-shop-settings');
    const shopNameDisplay = document.getElementById('shop-name-display');
    const shopLogoContainer = document.getElementById('shop-logo-container');

    let currentLogoBase64 = localStorage.getItem('shop_logo_base64') || null;

    // Load initial settings
    function loadShopSettings() {
        const savedName = localStorage.getItem('shop_name') || 'My TikTok Shop';
        shopNameDisplay.textContent = savedName;
        settingsShopNameInput.value = savedName;

        if (currentLogoBase64) {
            // Apply logo in sidebar
            shopLogoContainer.innerHTML = `<img src="${currentLogoBase64}" style="width: 100%; height: 100%; object-fit: cover;">`;
            
            // Apply logo in settings preview
            settingsLogoPreviewIcon.style.display = 'none';
            settingsLogoPreviewImg.src = currentLogoBase64;
            settingsLogoPreviewImg.style.display = 'block';
        } else {
            shopLogoContainer.innerHTML = `<i class="fas fa-store text-cyan" id="shop-logo-icon" style="font-size: 16px;"></i>`;
            settingsLogoPreviewIcon.style.display = 'block';
            settingsLogoPreviewImg.style.display = 'none';
        }
    }

    // Open Modal
    if (shopBadgeContainer) {
        shopBadgeContainer.addEventListener('click', () => {
            const savedName = localStorage.getItem('shop_name') || 'My TikTok Shop';
            settingsShopNameInput.value = savedName;
            
            if (currentLogoBase64) {
                settingsLogoPreviewIcon.style.display = 'none';
                settingsLogoPreviewImg.src = currentLogoBase64;
                settingsLogoPreviewImg.style.display = 'block';
            } else {
                settingsLogoPreviewIcon.style.display = 'block';
                settingsLogoPreviewImg.style.display = 'none';
            }
            
            shopSettingsModal.classList.add('show');
        });
    }

    // Close Modal
    function closeSettingsModal() {
        if (shopSettingsModal) shopSettingsModal.classList.remove('show');
    }
    
    if (btnCloseShopSettings) btnCloseShopSettings.addEventListener('click', closeSettingsModal);
    
    // Clicking outside modal content to close it
    if (shopSettingsModal) {
        shopSettingsModal.addEventListener('click', (e) => {
            if (e.target === shopSettingsModal) {
                closeSettingsModal();
            }
        });
    }

    // Trigger file upload
    if (btnUploadLogoTrigger) {
        btnUploadLogoTrigger.addEventListener('click', () => {
            if (settingsShopLogoFileInput) settingsShopLogoFileInput.click();
        });
    }

    // Handle file upload and convert to base64
    if (settingsShopLogoFileInput) {
        settingsShopLogoFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 2 * 1024 * 1024) {
                    showToast('Ukuran file maksimal adalah 2MB!', 'error');
                    return;
                }

                const reader = new FileReader();
                reader.onload = function(evt) {
                    currentLogoBase64 = evt.target.result;
                    // Update preview in modal
                    settingsLogoPreviewIcon.style.display = 'none';
                    settingsLogoPreviewImg.src = currentLogoBase64;
                    settingsLogoPreviewImg.style.display = 'block';
                    showToast('Foto berhasil dimuat. Klik Simpan untuk memperbarui.', 'info');
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Save Settings
    if (btnSaveShopSettings) {
        btnSaveShopSettings.addEventListener('click', () => {
            const newName = settingsShopNameInput.value.trim();
            if (!newName) {
                showToast('Nama toko tidak boleh kosong!', 'error');
                return;
            }

            localStorage.setItem('shop_name', newName);
            if (currentLogoBase64) {
                localStorage.setItem('shop_logo_base64', currentLogoBase64);
            }

            // Apply changes
            loadShopSettings();
            closeSettingsModal();
            showToast('Profil toko berhasil diperbarui!', 'success');
        });
    }

    // ==========================================
    // ALL-IN-ONE DATABASE BACKUP & RESTORE
    // ==========================================
    const btnExportFullBackup = document.getElementById('btn-export-full-backup');
    const inputFullBackupFile = document.getElementById('input-full-backup-file');

    if (btnExportFullBackup) {
        btnExportFullBackup.addEventListener('click', () => {
            try {
                const dbBackup = {
                    campaigns: campaigns,
                    products: products,
                    dailyLogs: dailyLogs,
                    shopName: localStorage.getItem('shop_name') || 'My TikTok Shop',
                    shopLogoBase64: localStorage.getItem('shop_logo_base64') || null
                };

                const jsonStr = JSON.stringify(dbBackup, null, 2);
                const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const downloadAnchorNode = document.createElement('a');
                downloadAnchorNode.setAttribute("href", url);
                downloadAnchorNode.setAttribute("download", `cadangan_toko_lengkap_${Date.now()}.json`);
                document.body.appendChild(downloadAnchorNode);
                downloadAnchorNode.click();
                downloadAnchorNode.remove();
                URL.revokeObjectURL(url);
                
                showToast('Cadangan data toko berhasil diunduh!', 'success');
            } catch (err) {
                console.error('Error exporting database backup:', err);
                showToast('Gagal mencadangkan data: ' + err.message, 'error');
            }
        });
    }

    if (inputFullBackupFile) {
        inputFullBackupFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(evt) {
                try {
                    const importedData = JSON.parse(evt.target.result);
                    if (!importedData || typeof importedData !== 'object') {
                        showToast('Format file cadangan tidak valid!', 'error');
                        return;
                    }

                    if (Array.isArray(importedData.campaigns)) {
                        localStorage.setItem('tiktok_campaigns', JSON.stringify(importedData.campaigns));
                    }
                    if (Array.isArray(importedData.products)) {
                        localStorage.setItem('tiktok_products', JSON.stringify(importedData.products));
                    }
                    if (Array.isArray(importedData.dailyLogs)) {
                        localStorage.setItem('tiktok_daily_logs', JSON.stringify(importedData.dailyLogs));
                    }
                    if (importedData.shopName) {
                        localStorage.setItem('shop_name', importedData.shopName);
                    }
                    if (importedData.shopLogoBase64) {
                        localStorage.setItem('shop_logo_base64', importedData.shopLogoBase64);
                    } else {
                        localStorage.removeItem('shop_logo_base64');
                    }

                    showToast('Seluruh data toko berhasil dipulihkan! Memuat ulang...', 'success');
                    setTimeout(() => {
                        location.reload();
                    }, 1000);
                } catch (err) {
                    console.error('Error restoring database backup:', err);
                    showToast('Gagal memulihkan data: ' + err.message, 'error');
                }
            };
            reader.readAsText(file);
        });
    }

    // ==========================================
    // DAILY AD PERFORMANCE TRACKER LOGIC
    // ==========================================
    const dailyLogForm = document.getElementById('daily-log-form');
    const dailyProductSelect = document.getElementById('daily-product');
    const dailyLogsTableBody = document.getElementById('daily-logs-table-body');

    // Auto-set daily-date input to today's date
    const dailyDateInput = document.getElementById('daily-date');
    if (dailyDateInput) {
        const today = new Date().toISOString().split('T')[0];
        dailyDateInput.value = today;
    }

    function saveDailyLogsToStorage() {
        localStorage.setItem('tiktok_daily_logs', JSON.stringify(dailyLogs));
    }

    function updateDailyProductDropdown() {
        const selectEl = document.getElementById('daily-product');
        if (!selectEl) return;
        
        selectEl.innerHTML = '<option value="">-- Tanpa HPP (Hanya Potong Iklan) --</option>';
        
        products.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.name;
            selectEl.appendChild(opt);
        });
    }

    function getProductNetMargin(prod) {
        if (!prod) return 0;
        if (prod.netMargin !== undefined) return prod.netMargin;
        
        const price = prod.price || 0;
        const hpp = prod.hpp || 0;
        const marketplaceFee = prod.marketplaceFee !== undefined ? prod.marketplaceFee : 4.0;
        const dynamicCommission = prod.dynamicCommission !== undefined ? prod.dynamicCommission : 2.0;
        const affiliateFee = prod.affiliateFee !== undefined ? prod.affiliateFee : 0.0;
        const sapFee = prod.sapFee !== undefined ? prod.sapFee : 0.0;
        const growthXtraFee = prod.growthXtraFee !== undefined ? prod.growthXtraFee : 0.0;
        const serviceFee = prod.serviceFee !== undefined ? prod.serviceFee : 1250;
        const logisticCost = prod.logisticCost !== undefined ? prod.logisticCost : 3000;
        
        const feePct = marketplaceFee + dynamicCommission + affiliateFee + sapFee + growthXtraFee;
        const totalFees = (price * (feePct / 100)) + serviceFee + logisticCost;
        return price - hpp - totalFees;
    }

    function renderDailyLogs() {
        try {
            if (!dailyLogsTableBody) return;

            if (!Array.isArray(dailyLogs)) {
                dailyLogs = [];
            }

            if (dailyLogs.length === 0) {
                dailyLogsTableBody.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center text-gray">Belum ada catatan harian. Masukkan data di sebelah kiri untuk merekam catatan baru.</td>
                    </tr>
                `;
                return;
            }

            const sortedLogs = [...dailyLogs].sort((a, b) => {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
                return dateB - dateA;
            });

            dailyLogsTableBody.innerHTML = '';
            sortedLogs.forEach(log => {
                const tr = document.createElement('tr');
                let formattedDate = 'Tanpa Tanggal';
                if (log.date) {
                    const d = new Date(log.date);
                    if (!isNaN(d.getTime())) {
                        formattedDate = d.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
                    }
                }
                
                let productName = '<span class="text-muted">-</span>';
                let netProfit = log.gmv - log.spend; // fallback
                
                if (log.productId && Array.isArray(products)) {
                    const prod = products.find(p => p.id === log.productId);
                    if (prod) {
                        productName = prod.name;
                        netProfit = (log.orders * getProductNetMargin(prod)) - log.spend;
                    }
                }

                const roas = log.spend > 0 ? (log.gmv / log.spend) : 0;
                const profitColor = netProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-pink)';

                tr.innerHTML = `
                    <td><strong>${formattedDate}</strong></td>
                    <td>${productName}</td>
                    <td>${formatRupiah(log.spend)}</td>
                    <td>${formatRupiah(log.gmv)}</td>
                    <td>${log.orders} pcs</td>
                    <td><span class="badge ${roas >= 2.5 ? 'badge-cyan' : 'badge-pink'}">${roas.toFixed(2)}x</span></td>
                    <td style="color: ${profitColor}; font-weight: 600;">${formatRupiah(netProfit)}</td>
                    <td>
                        <button class="btn btn-secondary btn-sm btn-delete-daily" data-id="${log.id}" style="padding: 4px 8px; font-size: 11px; cursor: pointer;">
                            <i class="fas fa-trash"></i> Hapus
                        </button>
                    </td>
                `;
                dailyLogsTableBody.appendChild(tr);
            });

            document.querySelectorAll('.btn-delete-daily').forEach(btn => {
                btn.addEventListener('click', () => {
                    const logId = btn.getAttribute('data-id');
                    if (confirm('Apakah Anda yakin ingin menghapus catatan harian ini?')) {
                        dailyLogs = dailyLogs.filter(log => log.id !== logId);
                        saveDailyLogsToStorage();
                        renderDailyLogs();
                        updateDailyChart();
                    }
                });
            });
            
            // Render the financial calendar
            renderCalendar();
        } catch (err) {
            console.error('Error rendering daily logs:', err);
            showToast('Gagal menampilkan riwayat harian: ' + err.message, 'error');
        }
    }

    function updateDailyChart() {
        try {
            const canvas = document.getElementById('chart-daily-trend');
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            if (charts.dailyTrend) {
                charts.dailyTrend.destroy();
                charts.dailyTrend = null;
            }

            if (!Array.isArray(dailyLogs) || dailyLogs.length === 0) return;

            const sortedLogs = [...dailyLogs].sort((a, b) => {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
                return dateA - dateB;
            });
            
            const labels = sortedLogs.map(log => {
                const d = new Date(log.date);
                return isNaN(d.getTime()) ? '' : `${d.getDate()}/${d.getMonth() + 1}`;
            });

            const spendData = sortedLogs.map(log => log.spend);
            const gmvData = sortedLogs.map(log => log.gmv);
            const profitData = sortedLogs.map(log => {
                let netProfit = log.gmv - log.spend;
                if (log.productId && Array.isArray(products)) {
                    const prod = products.find(p => p.id === log.productId);
                    if (prod) {
                        netProfit = (log.orders * getProductNetMargin(prod)) - log.spend;
                    }
                }
                return netProfit;
            });

            charts.dailyTrend = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Omset (GMV)',
                            data: gmvData,
                            borderColor: '#25F4EE',
                            backgroundColor: 'rgba(37, 244, 238, 0.05)',
                            borderWidth: 2,
                            pointRadius: 3,
                            tension: 0.2
                        },
                        {
                            label: 'Laba Bersih Riil',
                            data: profitData,
                            borderColor: '#00FF87',
                            backgroundColor: 'rgba(0, 255, 135, 0.05)',
                            borderWidth: 2.5,
                            pointRadius: 3,
                            tension: 0.2
                        },
                        {
                            label: 'Spend (Biaya)',
                            data: spendData,
                            borderColor: '#FE2C55',
                            backgroundColor: 'rgba(254, 44, 85, 0.05)',
                            borderWidth: 2,
                            pointRadius: 3,
                            tension: 0.2
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { labels: { color: '#90A0B7', font: { family: 'Outfit', size: 11 } } }
                    },
                    scales: {
                        x: { ticks: { color: '#90A0B7', font: { family: 'Outfit' } }, grid: { color: 'rgba(255, 255, 255, 0.03)' } },
                        y: { 
                            ticks: { 
                                color: '#90A0B7', 
                                font: { family: 'Outfit' },
                                callback: value => 'Rp ' + (value >= 1e6 ? (value/1e6).toFixed(1) + 'jt' : (value/1e3).toFixed(0) + 'rb')
                            }, 
                            grid: { color: 'rgba(255, 255, 255, 0.03)' } 
                        }
                    }
                }
            });
        } catch (err) {
            console.error('Error rendering daily chart:', err);
            showToast('Gagal menampilkan grafik harian: ' + err.message, 'error');
        }
    }



    // Financial Calendar State & Logic
    let currentCalendarYear = new Date().getFullYear();
    let currentCalendarMonth = new Date().getMonth();

    function renderCalendar() {
        try {
            const calendarContainer = document.getElementById('financial-calendar');
            const monthYearLabel = document.getElementById('calendar-month-year');
            if (!calendarContainer || !monthYearLabel) return;

            const monthNames = [
                "Januari", "Februari", "Maret", "April", "Mei", "Juni",
                "Juli", "Agustus", "September", "Oktober", "November", "Desember"
            ];

            monthYearLabel.textContent = `${monthNames[currentCalendarMonth]} ${currentCalendarYear}`;

            const firstDay = new Date(currentCalendarYear, currentCalendarMonth, 1).getDay();
            const numDays = new Date(currentCalendarYear, currentCalendarMonth + 1, 0).getDate();

            calendarContainer.innerHTML = '';

            // Render empty spacer cells
            for (let i = 0; i < firstDay; i++) {
                const emptyCell = document.createElement('div');
                emptyCell.style.padding = '12px 6px';
                calendarContainer.appendChild(emptyCell);
            }

            // Render days
            for (let day = 1; day <= numDays; day++) {
                const dateStr = `${currentCalendarYear}-${String(currentCalendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const logsToday = Array.isArray(dailyLogs) ? dailyLogs.filter(log => log.date === dateStr) : [];
                
                const cell = document.createElement('div');
                cell.style.padding = '10px 4px';
                cell.style.borderRadius = '6px';
                cell.style.fontFamily = "'Outfit', sans-serif";
                cell.style.fontSize = '12px';
                cell.style.fontWeight = '600';
                cell.style.textAlign = 'center';
                cell.style.cursor = 'default';
                cell.style.transition = 'all 0.15s ease';
                cell.textContent = day;

                if (logsToday.length > 0) {
                    let daySpend = 0;
                    let dayGmv = 0;
                    let dayProfit = 0;

                    logsToday.forEach(log => {
                        daySpend += log.spend;
                        dayGmv += log.gmv;
                        
                        let netProfit = log.gmv - log.spend;
                        if (log.productId && Array.isArray(products)) {
                            const prod = products.find(p => p.id === log.productId);
                            if (prod) {
                                netProfit = (log.orders * getProductNetMargin(prod)) - log.spend;
                            }
                        }
                        dayProfit += netProfit;
                    });

                    cell.style.cursor = 'pointer';
                    if (dayProfit >= 0) {
                        cell.style.background = 'rgba(0, 255, 135, 0.08)';
                        cell.style.border = '1px solid rgba(0, 255, 135, 0.25)';
                        cell.style.color = '#00FF87';
                    } else {
                        cell.style.background = 'rgba(254, 44, 85, 0.08)';
                        cell.style.border = '1px solid rgba(254, 44, 85, 0.25)';
                        cell.style.color = 'var(--accent-pink)';
                    }

                    cell.addEventListener('mouseenter', () => {
                        cell.style.transform = 'scale(1.08)';
                        cell.style.boxShadow = '0 0 8px rgba(255, 255, 255, 0.05)';
                    });
                    cell.addEventListener('mouseleave', () => {
                        cell.style.transform = 'scale(1)';
                        cell.style.boxShadow = 'none';
                    });

                    cell.addEventListener('click', () => {
                        const profitText = dayProfit >= 0 ? `Untung: ${formatRupiah(dayProfit)}` : `Rugi: ${formatRupiah(Math.abs(dayProfit))}`;
                        const toastType = dayProfit >= 0 ? 'success' : 'error';
                        showToast(
                            `Detail ${day} ${monthNames[currentCalendarMonth]}:\nSpend: ${formatRupiah(daySpend)} | GMV: ${formatRupiah(dayGmv)} | ${profitText}`,
                            toastType
                        );
                    });
                } else {
                    cell.style.background = 'rgba(255, 255, 255, 0.01)';
                    cell.style.border = '1px solid rgba(255, 255, 255, 0.02)';
                    cell.style.color = '#607087';
                }

                calendarContainer.appendChild(cell);
            }
        } catch (err) {
            console.error('Error rendering calendar:', err);
        }
    }

    const btnPrevMonth = document.getElementById('btn-prev-month');
    const btnNextMonth = document.getElementById('btn-next-month');

    if (btnPrevMonth) {
        btnPrevMonth.addEventListener('click', () => {
            currentCalendarMonth--;
            if (currentCalendarMonth < 0) {
                currentCalendarMonth = 11;
                currentCalendarYear--;
            }
            renderCalendar();
        });
    }

    if (btnNextMonth) {
        btnNextMonth.addEventListener('click', () => {
            currentCalendarMonth++;
            if (currentCalendarMonth > 11) {
                currentCalendarMonth = 0;
                currentCalendarYear++;
            }
            renderCalendar();
        });
    }

    if (dailyLogForm) {
        dailyLogForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            try {
                const dateEl = document.getElementById('daily-date');
                const productEl = document.getElementById('daily-product');
                const spendEl = document.getElementById('daily-spend');
                const gmvEl = document.getElementById('daily-gmv');
                const ordersEl = document.getElementById('daily-orders');

                if (!dateEl || !spendEl || !gmvEl || !ordersEl) {
                    showToast('Gagal menemukan input form harian!', 'error');
                    return;
                }

                if (!dateEl.value) {
                    showToast('Harap pilih Tanggal Catat terlebih dahulu!', 'error');
                    return;
                }

                const newLog = {
                    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                    date: dateEl.value,
                    productId: productEl ? productEl.value : '',
                    spend: parseFloat(spendEl.value) || 0,
                    gmv: parseFloat(gmvEl.value) || 0,
                    orders: parseFloat(ordersEl.value) || 0
                };

                dailyLogs.push(newLog);
                saveDailyLogsToStorage();
                
                spendEl.value = '';
                gmvEl.value = '';
                ordersEl.value = '';

                renderDailyLogs();
                updateDailyChart();
                showToast('Catatan harian berhasil disimpan!', 'success');
            } catch (err) {
                console.error('Error saving daily log:', err);
                showToast('Gagal menyimpan: ' + err.message, 'error');
            }
        });
    }

    const btnExportDailyCsv = document.getElementById('btn-export-daily-csv');
    if (btnExportDailyCsv) {
        btnExportDailyCsv.addEventListener('click', () => {
            if (!Array.isArray(dailyLogs) || dailyLogs.length === 0) {
                showToast('Tidak ada data catatan harian untuk diekspor.', 'error');
                return;
            }

            try {
                let csvContent = '\uFEFF'; // UTF-8 BOM
                csvContent += '"Tanggal","Produk Terkait","Spend (Biaya)","GMV (Omset)","Orders","ROAS","Laba Bersih"\n';

                const sortedLogs = [...dailyLogs].sort((a, b) => {
                    const dateA = new Date(a.date);
                    const dateB = new Date(b.date);
                    if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
                    return dateA - dateB;
                });

                sortedLogs.forEach(log => {
                    const d = new Date(log.date);
                    const formattedDate = !isNaN(d.getTime()) ? d.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' }) : log.date;
                    
                    let productName = '-';
                    let netProfit = log.gmv - log.spend;
                    if (log.productId && Array.isArray(products)) {
                        const prod = products.find(p => p.id === log.productId);
                        if (prod) {
                            productName = prod.name;
                            netProfit = (log.orders * getProductNetMargin(prod)) - log.spend;
                        }
                    }

                    const roas = log.spend > 0 ? (log.gmv / log.spend) : 0;
                    const escapedProdName = productName.replace(/"/g, '""');

                    csvContent += `"${formattedDate}","${escapedProdName}",${log.spend},${log.gmv},${log.orders},${roas.toFixed(2)},${netProfit}\n`;
                });

                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const downloadAnchorNode = document.createElement('a');
                downloadAnchorNode.setAttribute("href", url);
                downloadAnchorNode.setAttribute("download", `riwayat_iklan_harian_${Date.now()}.csv`);
                document.body.appendChild(downloadAnchorNode);
                downloadAnchorNode.click();
                downloadAnchorNode.remove();
                URL.revokeObjectURL(url);
                showToast('Ekspor riwayat harian berhasil diunduh!', 'success');
            } catch (err) {
                console.error('Error exporting daily CSV:', err);
                showToast('Gagal ekspor CSV: ' + err.message, 'error');
            }
        });
    }

    const btnPrintDailyReport = document.getElementById('btn-print-daily-report');
    if (btnPrintDailyReport) {
        btnPrintDailyReport.addEventListener('click', () => {
            if (!Array.isArray(dailyLogs) || dailyLogs.length === 0) {
                showToast('Harap isi catatan harian terlebih dahulu!', 'error');
                return;
            }

            try {
                // Populate shop metadata
                document.getElementById('print-daily-shop-name').textContent = document.getElementById('shop-name-display').textContent;
                document.getElementById('print-daily-report-date').textContent = 'Tanggal Cetak: ' + new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

                // Update logo
                const logoPreviewImg = document.getElementById('settings-logo-preview-img');
                const printLogoContainer = document.getElementById('print-daily-shop-logo');
                if (logoPreviewImg && logoPreviewImg.style.display !== 'none' && logoPreviewImg.src) {
                    printLogoContainer.innerHTML = `<img src="${logoPreviewImg.src}" style="width: 100%; height: 100%; object-fit: cover;">`;
                } else {
                    printLogoContainer.innerHTML = `<i class="fas fa-store" style="font-size: 24px; color: #333;"></i>`;
                }

                // Calculate Totals
                let totalSpend = 0;
                let totalGmv = 0;
                let totalOrders = 0;
                let totalNetProfit = 0;

                const sortedLogs = [...dailyLogs].sort((a, b) => {
                    const dateA = new Date(a.date);
                    const dateB = new Date(b.date);
                    if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
                    return dateB - dateA; // reverse chronological for print table
                });

                const printDailyTableBody = document.getElementById('print-daily-table-body');
                printDailyTableBody.innerHTML = '';

                sortedLogs.forEach(log => {
                    totalSpend += log.spend;
                    totalGmv += log.gmv;
                    totalOrders += log.orders;

                    let productName = '-';
                    let netProfit = log.gmv - log.spend;
                    if (log.productId && Array.isArray(products)) {
                        const prod = products.find(p => p.id === log.productId);
                        if (prod) {
                            productName = prod.name;
                            netProfit = (log.orders * getProductNetMargin(prod)) - log.spend;
                        }
                    }
                    totalNetProfit += netProfit;

                    const d = new Date(log.date);
                    const formattedDate = !isNaN(d.getTime()) ? d.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' }) : log.date;
                    const roas = log.spend > 0 ? log.gmv / log.spend : 0;

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td style="padding: 6px; border-bottom: 1px solid #ddd;">${formattedDate}</td>
                        <td style="padding: 6px; border-bottom: 1px solid #ddd;">${productName}</td>
                        <td style="padding: 6px; text-align: right; border-bottom: 1px solid #ddd;">${formatRupiah(log.spend)}</td>
                        <td style="padding: 6px; text-align: right; border-bottom: 1px solid #ddd;">${formatRupiah(log.gmv)}</td>
                        <td style="padding: 6px; text-align: right; border-bottom: 1px solid #ddd;">${log.orders} pcs</td>
                        <td style="padding: 6px; text-align: right; border-bottom: 1px solid #ddd; font-weight: bold;">${roas.toFixed(2)}x</td>
                        <td style="padding: 6px; text-align: right; border-bottom: 1px solid #ddd; font-weight: bold; color: ${netProfit >= 0 ? '#008744' : '#d62d20'}">${formatRupiah(netProfit)}</td>
                    `;
                    printDailyTableBody.appendChild(tr);
                });

                const avgRoas = totalSpend > 0 ? totalGmv / totalSpend : 0;

                document.getElementById('print-daily-total-spend').textContent = formatRupiah(totalSpend);
                document.getElementById('print-daily-total-gmv').textContent = formatRupiah(totalGmv);
                document.getElementById('print-daily-avg-roas').textContent = avgRoas.toFixed(2) + 'x';
                
                const printNetEl = document.getElementById('print-daily-net-profit');
                printNetEl.textContent = formatRupiah(totalNetProfit);
                printNetEl.style.color = totalNetProfit >= 0 ? '#008744' : '#d62d20';

                // Set printing mode daily log
                document.body.classList.add('print-mode-daily');
                document.body.classList.remove('print-mode-dashboard');

                showToast('Membuka dialog pencetakan laporan harian...', 'info');
                setTimeout(() => {
                    window.print();
                    setTimeout(() => {
                        document.body.classList.remove('print-mode-daily');
                    }, 1000);
                }, 500);

            } catch (err) {
                console.error('Error generating print daily report:', err);
                showToast('Gagal cetak PDF: ' + err.message, 'error');
            }
        });
    }

    // ==========================================
    // NOTIFICATION BELL & DIAGNOSTIC SYSTEM
    // ==========================================
    if (document.getElementById('btn-notifications') && document.getElementById('notification-panel')) {
        document.getElementById('btn-notifications').addEventListener('click', (e) => {
            e.stopPropagation();
            const panel = document.getElementById('notification-panel');
            if (panel) {
                panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
            }
        });
    }

    if (document.getElementById('notification-close') && document.getElementById('notification-panel')) {
        document.getElementById('notification-close').addEventListener('click', () => {
            const panel = document.getElementById('notification-panel');
            if (panel) {
                panel.style.display = 'none';
            }
        });
    }

    // Close panel when clicking outside
    document.addEventListener('click', (e) => {
        const panel = document.getElementById('notification-panel');
        const btn = document.getElementById('btn-notifications');
        if (panel && panel.style.display === 'block') {
            if (!panel.contains(e.target) && e.target !== btn && (btn && !btn.contains(e.target))) {
                panel.style.display = 'none';
            }
        }
    });

    function updateNotifications() {
        const notificationBadge = document.getElementById('notification-badge');
        const notificationList = document.getElementById('notification-list');
        if (!notificationBadge || !notificationList) return;

        const alerts = [];

        campaigns.forEach(c => {
            const roas = c.spend > 0 ? (c.gmv / c.spend) : 0;
            const ctr = c.impressions > 0 ? (c.clicks / c.impressions * 100) : 0;

            if (roas < 1.8 && c.spend > 0) {
                alerts.push({
                    type: 'danger',
                    text: `Kampanye <strong>${c.name}</strong> boncos! ROAS aktual (${roas.toFixed(2)}x) di bawah target impas.`
                });
            } else if (c.spend > 0 && roas < c.targetRoas) {
                alerts.push({
                    type: 'warning',
                    text: `ROAS <strong>${c.name}</strong> (${roas.toFixed(2)}x) belum mencapai Target ROAS (${c.targetRoas.toFixed(1)}x).`
                });
            }

            if (c.spend > 0 && ctr < 1.0) {
                alerts.push({
                    type: 'warning',
                    text: `CTR <strong>${c.name}</strong> rendah (${ctr.toFixed(2)}%). Video kreatif perlu diperbarui.`
                });
            }
        });

        // Scan daily logs for negative profit (emergency margin alert)
        if (Array.isArray(dailyLogs)) {
            dailyLogs.forEach(log => {
                let netProfit = log.gmv - log.spend;
                if (log.productId && Array.isArray(products)) {
                    const prod = products.find(p => p.id === log.productId);
                    if (prod) {
                        netProfit = (log.orders * getProductNetMargin(prod)) - log.spend;
                    }
                }

                if (netProfit < 0) {
                    const d = new Date(log.date);
                    const formattedDate = !isNaN(d.getTime()) ? d.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' }) : log.date;
                    alerts.push({
                        type: 'danger',
                        text: `🚨 <strong>Rugi Harian!</strong> Pada tanggal ${formattedDate}, toko Anda boncos sebesar <strong>${formatRupiah(Math.abs(netProfit))}</strong>.`
                    });
                }
            });
        }

        if (alerts.length > 0) {
            notificationBadge.textContent = alerts.length;
            notificationBadge.style.display = 'flex';
            
            notificationList.innerHTML = '';
            alerts.forEach(alert => {
                const item = document.createElement('div');
                item.style.padding = '8px 12px';
                item.style.borderRadius = '8px';
                item.style.fontSize = '12px';
                item.style.lineHeight = '1.4';
                item.style.borderLeft = '4px solid';
                
                if (alert.type === 'danger') {
                    item.style.background = 'rgba(254, 44, 85, 0.08)';
                    item.style.borderColor = 'var(--accent-pink)';
                    item.style.color = '#FFA3B1';
                } else {
                    item.style.background = 'rgba(255, 170, 0, 0.08)';
                    item.style.borderColor = '#FFAA00';
                    item.style.color = '#FFEAA7';
                }
                
                item.innerHTML = alert.text;
                notificationList.appendChild(item);
            });
        } else {
            notificationBadge.style.display = 'none';
            notificationList.innerHTML = `
                <div class="notification-item text-center text-gray" style="font-size: 12px; padding: 10px 0; color: #90A0B7;">
                    Tidak ada notifikasi penting saat ini. Kampanye berjalan lancar!
                </div>
            `;
        }
    }

    // Load on start
    loadShopSettings();
    updateDailyProductDropdown();
    renderDailyLogs();
    updateNotifications();
    updateProductLeaderboard();
});
