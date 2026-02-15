// country selector dropdown
$(document).on('click', '.lang-dropdown', function (e) {
	e.stopPropagation(); // Prevent event bubbling to the document
	var $dropdown = $('#lang-dropdown');
	
	if ($dropdown.css('display') == 'block') {
	  closeDropDown('lang-dropdown');
	} else {
	  upDropDown('lang-dropdown');
	}
  });
  
  // Handle click outside the dropdown
  var $win = $(window);
  var $box = $('#lang-dropdown');
  $win.on('click.Bst', function (event) {
	if (
	  !$box.is(event.target) && // Not the dropdown itself
	  $box.has(event.target).length === 0 // Not a child of the dropdown
	) {
	  closeDropDown('lang-dropdown');
	}
  });
  
  // Open the dropdown
  function upDropDown(id) {
	$('#' + id).slideDown(600, function () {
	  $(this).css('display', 'block');
	});
  }
  
  // Close the dropdown
  function closeDropDown(id) {
	$('#' + id).slideUp(600, function () {
	  $(this).css('display', 'none');
	});
  }
  