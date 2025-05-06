# Import controllers
from .auth_controller import AuthController
from .admin_controller import AdminController
from .election_controller import ElectionController
from .college_controller import CollegeController

# Export controllers
__all__ = [
    'AuthController',
    'AdminController',
    'ElectionController',
    'CollegeController',
]
