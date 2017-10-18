var express = require('express')
var router = express.Router()

/**
 * Helper to check if an object's property does not exist or is empty.
 *
 * @see https://stackoverflow.com/a/28552610/1120652
 *
 * @param {Object} object
 *   The object whose property will be checked.
 * @param {string} property
 *   The property within the object to check.
 * @returns {boolean}
 *   TRUE if the property does not exist or is empty.
 */
var isEmpty = function (object, property) {
  return ((object[property] === undefined) ||
    (object[property].length === 0) ||
    (object[property] === 'undefined'))
}

/**
 * Performs a query against Elasticsearch and renders
 * the response.
 *
 * @param {Object} req
 *   The request object.
 * @param {Object} res
 *   The response object.
 */
var doSearch = function (req, res) {
  // Initialize the Elasticsearch client.
  var elasticsearch = require('elasticsearch')
  var client = new elasticsearch.Client({
    host: 'http://elastic:changeme@elasticsearch:9200',
    log: 'trace'
  })
  var search_string = ''
  var search_type = ''

  // Prepare the request body.
  var body = {
    'size': 100
  }
  if (!isEmpty(req.query, 'search') || !isEmpty(req.query, 'type')) {
    var query = {
      'bool': {}
    }

    if (!isEmpty(req.query, 'search')) {
      query.bool.must = {
        'multi_match': {
          'fields': [
            'title^2',
            'summary'
          ],
          'query': req.query.search,
          'fuzziness': 'auto'
        }
      }
      search_string = req.query.search
    }

    if (!isEmpty(req.query, 'type')) {
      query.bool.filter = [
        {
          'term': {
            'type': req.query.type
          }
        }
      ]
      search_type = req.query.type
    }

    body.query = query
  }

  // Add a type facet.
  body.aggs = {
    'type': {
      'terms': {
        'field': 'type'
      }
    }
  }

  // Perform the search request.
  client.search({
    index: 'elasticsearch_index_demo_elastic',
    body: body
  }).then(function (resp) {
    var hits = resp.hits.hits
    var total = resp.hits.total
    // Render results in a template.
    res.render('index', {
      hits: hits,
      total: total,
      aggregations: resp.aggregations.type.buckets,
      search_string: search_string,
      search_type: search_type
    })
  }, function (err) {
    console.trace(err.message)
  })
}

/**
 * The initial request that loads the form and all the documents in Elasticsearch.
 *
 * @param {Object} req
 *   The request object.
 * @param {Object} res
 *   The response object.
 */
router.get('/', function (req, res) {
  doSearch(req, res)
})

/**
 * Processes form submissions by modifying the query for Elasticsearch.
 *
 * @param {Object} req
 *   The request object.
 * @param {Object} res
 *   The response object.
 */
router.post('/', function (req, res) {
  doSearch(req, res)
})

module.exports = router
