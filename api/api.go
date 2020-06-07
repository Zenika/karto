package api

import (
	"encoding/json"
	"fmt"
	"karto/types"
	"log"
	"net/http"
	"sync"
)

type handler struct {
	mutex              sync.RWMutex
	lastAnalysisResult types.AnalysisResult
}

func newHandler() *handler {
	handler := &handler{
		lastAnalysisResult: types.AnalysisResult{
			Pods:          make([]types.Pod, 0),
			AllowedRoutes: make([]types.AllowedRoute, 0),
		},
	}
	return handler
}

func (handler *handler) keepUpdated(resultsChannel <-chan types.AnalysisResult) {
	for {
		newResults := <-resultsChannel
		handler.mutex.Lock()
		handler.lastAnalysisResult = newResults
		handler.mutex.Unlock()
	}
}

func (handler *handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	handler.mutex.RLock()
	defer handler.mutex.RUnlock()
	json.NewEncoder(w).Encode(handler.lastAnalysisResult)
}

func healthCheck(w http.ResponseWriter, _ *http.Request) {
	fmt.Fprintln(w, "OK")
}

func Expose(resultsChannel <-chan types.AnalysisResult) {
	frontendHandler := http.FileServer(http.Dir("./front/build"))
	apiHandler := newHandler()
	go apiHandler.keepUpdated(resultsChannel)
	mux := http.NewServeMux()
	mux.Handle("/", frontendHandler)
	mux.Handle("/api/analysisResult", apiHandler)
	mux.HandleFunc("/health", healthCheck)
	log.Println("Listening to incoming requests...")
	http.ListenAndServe(":8000", mux)
}
