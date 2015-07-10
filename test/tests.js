var chai = require('chai')
  , airtv = require('../lib/airtv')
  ;

chai.should();

describe('airtv', function(){
  // Test getSeriesByName.
  describe('.getSeriesByName("Game of Thrones")', function() {
    it('should return 1 result', function(done) {
      airtv.getSeriesByName('game of thrones', function(error, response, result) {
        result.should.have.property('Series');
        done();
      });
    });
  });

  // Test getSeriesByID.
  describe('.getSeriesByID(121361, "en")', function() {
    it('should return Series and Episode properties', function(done) {
      airtv.getSeriesByID(121361, 'en', function(error, response, result) {
        result.should.have.property('Series')
        result.should.have.property('Episode');
        done();
      });
    });
  });
});