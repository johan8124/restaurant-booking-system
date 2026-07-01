import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const app = express();
const PORT = process.env.PORT || 5000;
const allowedStatuses = ['Pending', 'Confirmed', 'Seated', 'Cancelled'];

app.use(cors());
app.use(express.json());

const bookingSchema = new mongoose.Schema({
  customerName: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, required: true, trim: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  guests: { type: Number, required: true, min: 1, max: 20 },
  occasion: { type: String, trim: true, default: 'Dinner' },
  seating: { type: String, trim: true, default: 'Main dining' },
  notes: { type: String, trim: true, default: '' },
  status: { type: String, enum: allowedStatuses, default: 'Pending' }
}, { timestamps: true });

const Booking = mongoose.model('Booking', bookingSchema);
const memoryBookings = [];

function isMongoReady() {
  return mongoose.connection.readyState === 1;
}

function serializeMemoryBooking(booking) {
  return {
    ...booking,
    _id: booking._id,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt
  };
}

function validateBooking(payload, partial = false) {
  const errors = {};
  const required = ['customerName', 'email', 'phone', 'date', 'time', 'guests'];

  if (!partial) {
    required.forEach((field) => {
      if (!payload[field]) errors[field] = 'This field is required.';
    });
  }

  if (payload.email && !/^\S+@\S+\.\S+$/.test(payload.email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (payload.guests !== undefined) {
    const guests = Number(payload.guests);
    if (!Number.isInteger(guests) || guests < 1 || guests > 20) {
      errors.guests = 'Guests must be between 1 and 20.';
    }
  }

  if (payload.status && !allowedStatuses.includes(payload.status)) {
    errors.status = 'Invalid booking status.';
  }

  return errors;
}

app.get('/api/health', (_req, res) => {
  res.json({
    message: 'Restaurant booking API is running',
    database: isMongoReady() ? 'mongodb' : 'memory'
  });
});

app.get('/api/bookings', async (_req, res) => {
  try {
    if (!isMongoReady()) {
      return res.json([...memoryBookings].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    }

    const bookings = await Booking.find().sort({ date: 1, time: 1, createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/bookings', async (req, res) => {
  try {
    const errors = validateBooking(req.body);
    if (Object.keys(errors).length) {
      return res.status(422).json({ message: 'Booking validation failed.', errors });
    }

    const bookingData = {
      ...req.body,
      guests: Number(req.body.guests),
      status: req.body.status || 'Pending'
    };

    if (!isMongoReady()) {
      const now = new Date().toISOString();
      const booking = serializeMemoryBooking({
        ...bookingData,
        _id: randomUUID(),
        createdAt: now,
        updatedAt: now
      });
      memoryBookings.unshift(booking);
      return res.status(201).json(booking);
    }

    const booking = new Booking(bookingData);
    await booking.save();
    res.status(201).json(booking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put('/api/bookings/:id', async (req, res) => {
  try {
    const errors = validateBooking(req.body, true);
    if (Object.keys(errors).length) {
      return res.status(422).json({ message: 'Booking validation failed.', errors });
    }

    if (!isMongoReady()) {
      const index = memoryBookings.findIndex((booking) => booking._id === req.params.id);
      if (index === -1) return res.status(404).json({ message: 'Booking not found.' });

      memoryBookings[index] = {
        ...memoryBookings[index],
        ...req.body,
        guests: req.body.guests === undefined ? memoryBookings[index].guests : Number(req.body.guests),
        updatedAt: new Date().toISOString()
      };
      return res.json(memoryBookings[index]);
    }

    const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    res.json(booking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/bookings/:id', async (req, res) => {
  try {
    if (!isMongoReady()) {
      const index = memoryBookings.findIndex((booking) => booking._id === req.params.id);
      if (index === -1) return res.status(404).json({ message: 'Booking not found.' });
      memoryBookings.splice(index, 1);
      return res.json({ success: true });
    }

    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/restaurant-bookings', {
      serverSelectionTimeoutMS: 2500
    });
    console.log('MongoDB connected');
  } catch (error) {
    console.warn(`MongoDB unavailable, using in-memory bookings: ${error.message}`);
  }

  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

startServer();
