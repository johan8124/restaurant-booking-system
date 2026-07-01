import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  UsersRound,
  Utensils
} from 'lucide-react';
import './styles.css';

const defaultForm = {
  customerName: '',
  email: '',
  phone: '',
  date: new Date().toISOString().slice(0, 10),
  time: '19:00',
  guests: 2,
  occasion: 'Dinner',
  seating: 'Main dining',
  notes: ''
};

const API_URL = import.meta.env.VITE_API_URL || '';

const statusTone = {
  Pending: 'warning',
  Confirmed: 'success',
  Seated: 'info',
  Cancelled: 'danger'
};

function App() {
  const [bookings, setBookings] = React.useState([]);
  const [form, setForm] = React.useState(defaultForm);
  const [errors, setErrors] = React.useState({});
  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('All');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [notice, setNotice] = React.useState('');

  const fetchBookings = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/bookings`);
      const data = await response.json();
      setBookings(Array.isArray(data) ? data : []);
    } catch {
      setNotice('Unable to reach the booking API.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const filteredBookings = bookings.filter((booking) => {
    const text = `${booking.customerName} ${booking.email} ${booking.phone} ${booking.date}`.toLowerCase();
    const matchesQuery = text.includes(query.toLowerCase());
    const matchesStatus = statusFilter === 'All' || booking.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const todaysBookings = bookings.filter((booking) => booking.date === defaultForm.date);
  const confirmedCount = bookings.filter((booking) => booking.status === 'Confirmed').length;
  const partyCount = bookings
    .filter((booking) => booking.status !== 'Cancelled')
    .reduce((total, booking) => total + Number(booking.guests || 0), 0);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: name === 'guests' ? Number(value) : value }));
    setErrors((current) => ({ ...current, [name]: '' }));
  }

  async function createBooking(event) {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    setErrors({});

    try {
      const response = await fetch(`${API_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await response.json();

      if (!response.ok) {
        setErrors(data.errors || {});
        setNotice(data.message || 'Unable to save this reservation.');
        return;
      }

      setBookings((current) => [data, ...current]);
      setForm(defaultForm);
      setNotice('Reservation created successfully.');
    } catch {
      setNotice('Unable to save this reservation.');
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id, status) {
    const previous = bookings;
    setBookings((current) => current.map((booking) => (booking._id === id ? { ...booking, status } : booking)));

    try {
      const response = await fetch(`${API_URL}/api/bookings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setBookings((current) => current.map((booking) => (booking._id === id ? data : booking)));
    } catch {
      setBookings(previous);
      setNotice('Status update failed.');
    }
  }

  async function deleteBooking(id) {
    const previous = bookings;
    setBookings((current) => current.filter((booking) => booking._id !== id));

    try {
      const response = await fetch(`${API_URL}/api/bookings/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Delete failed');
    } catch {
      setBookings(previous);
      setNotice('Delete failed.');
    }
  }

  return (
    <main>
      <section className="hero">
        <div className="heroOverlay">
          <nav className="topbar" aria-label="Restaurant summary">
            <div className="brand">
              <Utensils size={24} />
              <span>Maison Table</span>
            </div>
            <div className="contactPills">
              <span><MapPin size={16} /> Downtown</span>
              <span><Phone size={16} /> +1 555 0147</span>
            </div>
          </nav>

          <div className="heroGrid">
            <div className="heroCopy">
              <p className="eyebrow"><Sparkles size={16} /> Chef-led dining room</p>
              <h1>Restaurant Booking System</h1>
              <p>
                Capture guest details, coordinate table flow, and manage every reservation from one calm,
                responsive dashboard.
              </p>
            </div>

            <form className="bookingForm" onSubmit={createBooking}>
              <div className="formHeader">
                <div>
                  <span className="eyebrow">New reservation</span>
                  <h2>Book a table</h2>
                </div>
                <Plus size={22} />
              </div>

              <label>
                Guest name
                <input name="customerName" value={form.customerName} onChange={updateField} placeholder="Avery Stone" />
                {errors.customerName && <small>{errors.customerName}</small>}
              </label>

              <div className="twoColumns">
                <label>
                  Email
                  <input name="email" type="email" value={form.email} onChange={updateField} placeholder="avery@example.com" />
                  {errors.email && <small>{errors.email}</small>}
                </label>
                <label>
                  Phone
                  <input name="phone" value={form.phone} onChange={updateField} placeholder="+1 555 0192" />
                  {errors.phone && <small>{errors.phone}</small>}
                </label>
              </div>

              <div className="threeColumns">
                <label>
                  Date
                  <input name="date" type="date" value={form.date} onChange={updateField} />
                  {errors.date && <small>{errors.date}</small>}
                </label>
                <label>
                  Time
                  <input name="time" type="time" value={form.time} onChange={updateField} />
                  {errors.time && <small>{errors.time}</small>}
                </label>
                <label>
                  Guests
                  <input name="guests" type="number" min="1" max="20" value={form.guests} onChange={updateField} />
                  {errors.guests && <small>{errors.guests}</small>}
                </label>
              </div>

              <div className="twoColumns">
                <label>
                  Occasion
                  <select name="occasion" value={form.occasion} onChange={updateField}>
                    <option>Dinner</option>
                    <option>Birthday</option>
                    <option>Anniversary</option>
                    <option>Business</option>
                    <option>Family gathering</option>
                  </select>
                </label>
                <label>
                  Seating
                  <select name="seating" value={form.seating} onChange={updateField}>
                    <option>Main dining</option>
                    <option>Window table</option>
                    <option>Patio</option>
                    <option>Private room</option>
                    <option>Bar counter</option>
                  </select>
                </label>
              </div>

              <label>
                Notes
                <textarea name="notes" value={form.notes} onChange={updateField} placeholder="Allergies, accessibility, preferred table..." />
              </label>

              <button className="primaryButton" disabled={saving}>
                {saving ? 'Saving...' : 'Create reservation'}
              </button>
              {notice && <p className="notice">{notice}</p>}
            </form>
          </div>
        </div>
      </section>

      <section className="dashboard">
        <div className="stats">
          <Metric icon={<CalendarDays />} label="Today" value={todaysBookings.length} />
          <Metric icon={<CheckCircle2 />} label="Confirmed" value={confirmedCount} />
          <Metric icon={<UsersRound />} label="Covers" value={partyCount} />
          <Metric icon={<Clock3 />} label="Next slot" value={nextSlot(bookings)} />
        </div>

        <div className="panelHeader">
          <div>
            <span className="eyebrow">Reservation desk</span>
            <h2>Bookings</h2>
          </div>
          <button className="iconButton" onClick={fetchBookings} aria-label="Refresh bookings">
            <RefreshCw size={18} />
          </button>
        </div>

        <div className="filters">
          <label className="searchBox">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search guest, email, phone, or date" />
          </label>
          <div className="segments" aria-label="Filter by status">
            {['All', 'Pending', 'Confirmed', 'Seated', 'Cancelled'].map((status) => (
              <button
                key={status}
                className={statusFilter === status ? 'active' : ''}
                onClick={() => setStatusFilter(status)}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="bookingList">
          {loading ? (
            <div className="emptyState">Loading reservations...</div>
          ) : filteredBookings.length === 0 ? (
            <div className="emptyState">No reservations match this view.</div>
          ) : (
            filteredBookings.map((booking) => (
              <article className="bookingCard" key={booking._id}>
                <div>
                  <div className="cardTopline">
                    <h3>{booking.customerName}</h3>
                    <span className={`badge ${statusTone[booking.status] || 'warning'}`}>{booking.status}</span>
                  </div>
                  <div className="bookingMeta">
                    <span><CalendarDays size={16} /> {booking.date}</span>
                    <span><Clock3 size={16} /> {booking.time}</span>
                    <span><UsersRound size={16} /> {booking.guests} guests</span>
                    <span><Utensils size={16} /> {booking.seating}</span>
                  </div>
                  <div className="bookingMeta">
                    <span><Mail size={16} /> {booking.email}</span>
                    <span><Phone size={16} /> {booking.phone}</span>
                  </div>
                  {booking.notes && <p className="notes">{booking.notes}</p>}
                </div>

                <div className="actions">
                  {['Pending', 'Confirmed', 'Seated', 'Cancelled'].map((status) => (
                    <button
                      key={status}
                      className={booking.status === status ? 'selected' : ''}
                      onClick={() => updateStatus(booking._id, status)}
                    >
                      {status}
                    </button>
                  ))}
                  <button className="deleteButton" onClick={() => deleteBooking(booking._id)} aria-label={`Delete ${booking.customerName}`}>
                    <Trash2 size={17} />
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

function Metric({ icon, label, value }) {
  return (
    <div className="metric">
      <div className="metricIcon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function nextSlot(bookings) {
  const now = new Date();
  const upcoming = bookings
    .filter((booking) => booking.status !== 'Cancelled')
    .map((booking) => ({ ...booking, startsAt: new Date(`${booking.date}T${booking.time}`) }))
    .filter((booking) => booking.startsAt >= now)
    .sort((a, b) => a.startsAt - b.startsAt)[0];

  return upcoming ? upcoming.time : 'Open';
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
