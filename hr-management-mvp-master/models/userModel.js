const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    photo:{
      type:String
    },
    firstName:{
      type:String
    },
    lastName:{
      type:String
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
    },
    role: {
      type: String,
      enum: [
        'admin',
        'hr',
        'manager',
        'applied-candidate',
        'prospected-employee',
        'employee',
        'ex-employee',
      ],
      default: 'hr',
    },
    email: {
      type: String,
      unique: true,
      // required: [true, 'Please provide your email'],
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email'],
      index: true,
    },
    password: {
      type: String,
      // required: [true, 'Please provide a password'],
      minlength: 8,
      select: false,
    },
    passwordConfirm: {
      type: String,
      // required: [true, 'Please confirm your password'],
      validate: {
        // This only works on CREATE and SAVE!!!
        validator: function (el) {
          return el === this.password;
        },
        message: 'Passwords are not the same!',
      },
    },
    designation:{
      type:String,
      default:''
    }, 
    companyWebsite:{
      type:String,
      default:''
    }, 
    contactNo:{
      type:String,
      default:''
    }, 
    city:{
      type:String,
      default:''
    }, 
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetCode: String,
    passwordResetExpires: Date,
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
      default: Date.now(),
    },
    lastLogout: {
      type: Date,
    },
    isPasswordGenerated: {
      type: Boolean,
      default:false
    },
  },
  {
    timestamps: true,
  }
);

// Virtual populate
// userSchema.virtual('reviews', {
//   ref: 'Review',
//   foreignField: 'User',
//   localField: '_id',
// });

userSchema.set('toObject', { virtuals: true });
userSchema.set('toJSON', { virtuals: true });

userSchema.pre('save', async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified('password')) return next();

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // Delete passwordConfirm field
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// userSchema.pre(/^find/, function (next) {
//   // this points to the current query
//   this.populate('featuredPackage');
//   next();
// });

userSchema.virtual('displayName').get(function () {
  return `${this.firstName || ''} ${this.lastName || ''}`;
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return JWTTimestamp < changedTimestamp;
  }

  // False means NOT changed
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
