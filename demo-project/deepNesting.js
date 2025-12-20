// This file demonstrates deep nesting issues

function processUserInput(user, action, data) {
  if (user) {
    if (user.isAuthenticated) {
      if (user.permissions) {
        if (user.permissions.includes('admin')) {
          if (action === 'delete') {
            if (data && data.id) {
              // ISSUE: Deep nesting (6 levels)
              if (data.confirmDelete === true) {
                console.log('Deleting item:', data.id);
                return { success: true };
              } else {
                return { success: false, error: 'Confirmation required' };
              }
            }
          }
        }
      }
    }
  }
  return { success: false, error: 'Invalid request' };
}

function validateFormData(formData) {
  if (formData) {
    if (formData.email) {
      if (formData.email.includes('@')) {
        if (formData.password) {
          if (formData.password.length >= 8) {
            // ISSUE: Deep nesting (5 levels)
            if (formData.confirmPassword === formData.password) {
              return { valid: true };
            }
          }
        }
      }
    }
  }
  return { valid: false };
}

module.exports = { processUserInput, validateFormData };
