const bookingService =
  require('../services/booking.service');


async function createBooking(
  req,
  res,
  next
) {
  try {
    if (
      req.user.role !==
      'customer'
    ) {
      return res.status(403).json({
        error:
          'Only customers can create bookings'
      });
    }


    const booking =
      await bookingService.createBooking(
        req.user.customerProfileId,
        req.body
      );


    return res.status(201).json({
      message:
        'Booking created successfully',

      booking
    });
  } catch (err) {
    next(err);
  }
}


async function getMyBookings(
  req,
  res,
  next
) {
  try {
    if (
      req.user.role !==
      'customer'
    ) {
      return res.status(403).json({
        error:
          'Only customers can access this'
      });
    }


    const bookings =
      await bookingService.getCustomerBookings(
        req.user.customerProfileId
      );


    return res.json({
      bookings
    });
  } catch (err) {
    next(err);
  }
}


async function getBooking(
  req,
  res,
  next
) {
  try {
    const booking =
      await bookingService.getBooking(
        req.params.id,
        req.user
      );


    return res.json({
      booking
    });
  } catch (err) {
    next(err);
  }
}


async function cancelBooking(
  req,
  res,
  next
) {
  try {
    const booking =
      await bookingService.cancelBooking(
        req.params.id,
        req.user
      );


    return res.json({
      message:
        'Booking cancelled successfully',

      booking
    });
  } catch (err) {
    next(err);
  }
}


async function getWorkerBookings(
  req,
  res,
  next
) {
  try {
    if (
      req.user.role !==
      'worker'
    ) {
      return res.status(403).json({
        error:
          'Only workers can access this'
      });
    }


    const bookings =
      await bookingService.getWorkerBookings(
        req.user.workerProfileId
      );


    return res.json({
      bookings
    });
  } catch (err) {
    next(err);
  }
}


async function acceptBooking(
  req,
  res,
  next
) {
  try {
    if (
      req.user.role !==
      'worker'
    ) {
      return res.status(403).json({
        error:
          'Only workers can accept bookings'
      });
    }


    const booking =
      await bookingService.acceptBooking(
        req.params.id,
        req.user.workerProfileId
      );


    return res.json({
      message:
        'Booking accepted',

      booking
    });
  } catch (err) {
    next(err);
  }
}


async function rejectBooking(
  req,
  res,
  next
) {
  try {
    if (req.user.role !== 'worker') {
      return res.status(403).json({
        error: 'Only workers can reject bookings'
      });
    }

    await bookingService.rejectBooking(
      req.params.id,
      req.user.workerProfileId
    );

    return res.json({
      message: 'Booking rejected'
    });
  } catch (err) {
    next(err);
  }
}


async function startBooking(
  req,
  res,
  next
) {
  try {
    if (
      req.user.role !==
      'worker'
    ) {
      return res.status(403).json({
        error:
          'Only workers can start bookings'
      });
    }


    const booking =
      await bookingService.startBooking(
        req.params.id,
        req.user.workerProfileId
      );


    return res.json({
      message:
        'Booking started',

      booking
    });
  } catch (err) {
    next(err);
  }
}


async function completeBooking(
  req,
  res,
  next
) {
  try {
    if (
      req.user.role !==
      'worker'
    ) {
      return res.status(403).json({
        error:
          'Only workers can complete bookings'
      });
    }


    const booking =
      await bookingService.completeBooking(
        req.params.id,
        req.user.workerProfileId
      );


    return res.json({
      message:
        'Booking completed',

      booking
    });
  } catch (err) {
    next(err);
  }
}


module.exports = {
  createBooking,
  getMyBookings,
  getBooking,
  cancelBooking,
  getWorkerBookings,
  acceptBooking,
  rejectBooking,
  startBooking,
  completeBooking
};