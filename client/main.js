import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import './main.html';

Router.route('/', function() {
	BlazeLayout.render('app');
});

Template.app.helpers({
  add(num) {
  	return num + 1;
  },

  signedIn() {
  	return Session.get('questions') ? true : false;
  },

  image() {
  	return (Session.get('index') < 8 ? 'non-calc/' : 'calc/') + Session.get('questions')[(parseInt(Session.get('index')))].q + (Session.get('mode') === 'check' ? 's' : '') + '.png';
  },

  length() {
  	if (!Session.get('questions'))
  		return 0;

  	var res = [];

  	for (var i = 0; i < 12; i++)
  		res.push('');

  	return res;
  },

  time() {
  	return Session.get('time');
  },

  answered(index) {
  	return Session.get('responses')[index] !== 'F' && Session.get('mode') === 'test' ? ' answered' : '';
  },

  question() {
  	return Session.get('index') + 1;
  },

  isTest() {
  	return Session.get('mode') === 'test';
  },

  isDone() {
  	return Session.get('mode') === 'done';
  },

  footer() {
  	return Session.get('mode') + '-footer';
  },

  correct(index) {
  	return Session.get('mode') === 'test' ? 'default' : (Session.get('questions')[index].a === Session.get('responses')[index] ? 'success' : 'danger');
  },

  changePadding() {
  	changePadding();
  },

  active(index) {
  	return Session.get('index') === index;
  }
});

Template['test-footer'].helpers({
  type() {
  	return Session.get('index') < 8 ? 'non-calculator' : 'calculator';
  },

  suggested() {
  	return (Session.get('index') < 8 ? '2' : '3') + ' minutes';
  }
});

Template['check-footer'].helpers({
	correct() {
		return Session.get('questions')[Session.get('index')].a;
	},

	response() {
		var r = Session.get('responses')[Session.get('index')];
		return r === 'F' ? 'Omitted' : r;
	},

	equal(a, b) {
		return a === b;
	}
});

Template['teacher'].helpers({
	from(time) {
		if(time === 0)
			return '';
	
		var t = Date.now() - time
			, s = t / 1000
			, str = '';
	
		if(s / 86400 > 1)
			str = (~~(s/86400)) + ' days ago'
		else if(s / 3600 > 1)
			str = (~~(s / 3600)) + ' hours ago'
		else if((s / 60) > 1)
			str = (~~(s / 60)) + ' minutes ago'
		else
			str = ~~s + ' seconds ago'
	
		return str;
	}, 

	add(num) {
		return num + 1;
	},

	active() {
		return 2;
	},

	equal(a, b) {
		// if ((String(a) === String(b)) !== (a === b))
		// 	console.log('WHAAA');
		return a === b;
	},

	studentIndex() {
		return parseInt(Session.get('studentIndex'));
	},

	questionIndex() {
		return parseInt(Session.get('questionIndex'));
	},

	getResponses(index) {
		return Session.get('results')[index].responses;
	},

	answer(studentIndex, questionIndex) {
		return Session.get('results')[studentIndex].test[questionIndex].a;
	},

	response(studentIndex, questionIndex) {
		return Session.get('results')[studentIndex].responses[questionIndex];
	},

	results() {
		return Session.get('results');
	},

	firstName(studentIndex) {
		return Session.get('results')[studentIndex].name.split(', ')[1].split(' ')[0];
	},

	reflection(studentIndex) {
		return Session.get('results')[studentIndex].reflection;
	},

	image(studentIndex, questionIndex, mode) {
		return (questionIndex < 8 ? 'non-calc/' : 'calc/') + Session.get('results')[studentIndex].test[questionIndex].q + (mode === 'solution' ? 's' : '') + '.png';
	},

	mode() {
		console.log(Session.get('mode'));
		return Session.get('mode');
	}
});

function updateTime() {
	var n = 1000 * 60 * (Session.get('mode') === 'test' ? .5 : .5) - Date.now() + Session.get('start-time');

	if (n < 0) {
		if (Session.get('mode') == 'test') {
			changeProblem(0);
			Session.set('start-time', Date.now());
			Session.set('mode', 'check');
		} else {
			var r = [];
			$.each(Session.get('responses'), function(i, val) {
				r.push(val === 'F' ? 'O' : val);
			});

			Meteor.call('insertTest', Session.get('studentId'), Session.get('testIndex'), r, $('#comment').val(), function (err, res) {
				if (err)
					return nofity(err.error, true);
			});

			window.clearInterval(Session.get('intervalHandle'));
			Session.set('mode', 'done');
			notify('Responses Submitted!', false);
		}

		return '0:00';
	}

  	Session.set('time', parseInt(n / 1000 / 60) + ':' + ('0' + parseInt(n / 1000 % 60)).slice(-2));
}

function changeProblem(index) {
	if (index < 0 || index > 11)
			return;
	
	if (Session.get('mode') === 'test') {
		var r = Session.get('responses'),
			ans = $('input:checked').val();
	
		r[Session.get('index')] = ans;
	
		if (ans)
			Session.set('responses', r);
	
		$('input').prop('checked', false);
	
		Session.set('index', index);
	
		$('input').filter(function() {
  			return this.value === Session.get('responses')[Session.get('index')];
  		}).prop('checked', true);
  	} else {
  		Session.set('index', index);
  	}
}

Template.app.events({
	'click .tabs': function(event, instance) {
		changeProblem(event.target.textContent - 1);
	},

	'click #student-id-submit': function(event, instance) {
		var id = $('#student-id').val();

		if (!id)
			return shakeInput();

		Meteor.call('getTest', id, function(err, res) {
			if (err) {
				shakeInput();
				return notify(err.error, true);
			}

			if (res.mode && res.mode === 'teacher') {
				for (var i = 0; i < res.res.length; i++) {
					var correct = 0;
					for (var j = 0; j < res.res[i].responses.length; j++)
						if (res.res[i].responses[j] === res.res[i].test[j].a)
							correct++;
					res.res[i].score = correct + '/' + res.res[i].responses.length;
				}

				Session.set('mode', 'question');
				Session.set('questionIndex', 0);
				Session.set('studentIndex', 0);
 				Session.set('results', res.res);
 				
				return BlazeLayout.render('teacher', { res: res.res });
			}

			Session.set('studentId', id);
			Session.set('testIndex', res.testIndex);
			Session.set('mode', 'test');
			Session.set('start-time', Date.now());
			Session.set('questions', res.questions);
			Session.set('index', 0);
			Session.set('responses', fillArray('F', 12));

			updateTime();
			Session.set('intervalHandle', window.setInterval(updateTime, 1000));

			notify('Welcome ' + res.name.split(', ')[1].split(' ')[0] + '!');
		});
	},

	'click #previous': function(event, instance) {
		changeProblem(Session.get('index') - 1);
	},

	'click #next': function(event, instance) {
		changeProblem(Session.get('index') + 1);
	}
});

Template.teacher.events({
	'click tr': function(event, instance) {
		Session.set('studentIndex', $(event.currentTarget).attr('name'));
	},

	'click .tabs': function(event, instance) {
		Session.set('questionIndex', $(event.currentTarget).attr('id'));
	},

	'click #previous': function(event, instance) {
		var current = Session.get('questionIndex');
		Session.set('questionIndex', current > 0 ? current - 1 : 0);
	},

	'click #next': function(event, instance) {
		var current = Session.get('questionIndex');
		Session.set('questionIndex', current < 11 ? current + 1 : 11);
	},

	'click #question-mode': function (event, instance) {
		Session.set('mode', 'question');
	},

	'click #solution-mode': function (event, instance) {
		Session.set('mode', 'solution');
	}
});

function changePadding() {
	var t = $('#navbar-top').height();
	var b = $('#navbar-bottom').height();

	$(document.body).css({
		'padding-top': (t ? (t + 'px') : '0px'),
		'padding-bottom': (b ? (b + 'px') : '0px')
	});
}

function fillArray(val, length) {
	var a = [];
	for (var i = 0; i < length; i++)
		a.push(val);

	return a;
}

function notify(text, isError) {
	$('body').append('<div id="message" class="' + (isError ? 'error' : 'success') + '">' + text + '</div>');
	$('#message').fadeIn(1000);

	setTimeout(() => $('#message').fadeOut(1000), 2000);
	setTimeout(() => $('#message').remove(), 3000);
}

function shakeInput() {
	var input = $('#student-id');
	input.addClass('shake');
	input.css('border', '3px solid red');

	setTimeout(() => {
		input.css('border', '3px solid #e6e6e6');
		input.removeClass('shake')
	}, 1000);
}

$(window).on('resize', changePadding);